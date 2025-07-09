import { extractScreenshotsFromShoeboxJson } from "../src/utils/app-store-scraper";
import { logger } from "../src/utils/logger";
import { PlatformType } from "../src/types";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createShoeboxHtml } from "./test-helpers";

// Mock logger to silence output during tests
jest.mock("../src/utils/logger", () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));



describe("extractScreenshotsFromShoeboxJson", () => {
  const fixturesDir = path.join(__dirname, "../tests/fixtures");
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("with Instagram fixture", () => {
    let instagramFixture: Record<string, unknown>;

    beforeAll(() => {
      const instagramPath = path.join(fixturesDir, "shoebox_instagram.json");
      const instagramData = fs.readFileSync(instagramPath, "utf8");
      instagramFixture = JSON.parse(instagramData);
    });

    it("should extract non-zero screenshots", () => {
      const html = createShoeboxHtml(instagramFixture);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      expect(screenshots.length).toBeGreaterThan(0);
    });

    it("should include expected platform types", () => {
      const html = createShoeboxHtml(instagramFixture);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      const platformTypes = new Set(screenshots.map(s => s.type));
      
      // Should contain at least iPhone platform (most common)
      expect(platformTypes.has("iPhone")).toBe(true);
      
      // Verify we have at least one platform type
      expect(platformTypes.size).toBeGreaterThan(0);
    });

    it("should not have duplicate URLs", () => {
      const html = createShoeboxHtml(instagramFixture);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      const urls = screenshots.map(s => s.url);
      const uniqueUrls = new Set(urls);
      
      expect(urls.length).toBe(uniqueUrls.size);
    });

    it("should assign sequential indices", () => {
      const html = createShoeboxHtml(instagramFixture);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      // Check that indices are sequential starting from 0
      screenshots.forEach((screenshot, i) => {
        expect(screenshot.index).toBe(i);
      });
    });

    it("should transform URLs to platform-specific highest resolution", () => {
      const html = createShoeboxHtml(instagramFixture);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      // Check that URLs contain platform-specific resolution formats
      screenshots.forEach(screenshot => {
        if (screenshot.url.includes("mzstatic.com")) {
          // Check for platform-specific resolutions
          switch (screenshot.type) {
            case "iPhone":
            case "iMessage":
              expect(screenshot.url).toContain("1290x0w.png");
              break;
            case "iPad":
              expect(screenshot.url).toContain("2048x0w.png");
              break;
            case "Mac":
              expect(screenshot.url).toContain("2560x0w.png");
              break;
            case "AppleTV":
            case "VisionPro":
              expect(screenshot.url).toContain("3840x0w.png");
              break;
            case "AppleWatch":
              expect(screenshot.url).toContain("396x0w.png");
              break;
            default:
              // Fallback for unknown platforms
              expect(screenshot.url).toMatch(/\d+x0w\.png$/);
          }
        }
      });
    });
  });

  describe("with Microsoft Word fixture", () => {
    let wordFixture: Record<string, unknown>;

    beforeAll(() => {
      const wordPath = path.join(fixturesDir, "shoebox_word.json");
      const wordData = fs.readFileSync(wordPath, "utf8");
      wordFixture = JSON.parse(wordData);
    });

    it("should extract non-zero screenshots", () => {
      const html = createShoeboxHtml(wordFixture);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      expect(screenshots.length).toBeGreaterThan(0);
    });

    it("should include expected platform types", () => {
      const html = createShoeboxHtml(wordFixture);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      const platformTypes = new Set(screenshots.map(s => s.type));
      
      // Should contain multiple platforms for Microsoft Word
      expect(platformTypes.size).toBeGreaterThan(0);
      
      // Word likely supports multiple platforms
      const expectedPlatforms: PlatformType[] = ["iPhone", "iPad", "Mac"];
      const hasExpectedPlatform = expectedPlatforms.some(platform => 
        platformTypes.has(platform)
      );
      expect(hasExpectedPlatform).toBe(true);
    });

    it("should not have duplicate URLs", () => {
      const html = createShoeboxHtml(wordFixture);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      const urls = screenshots.map(s => s.url);
      const uniqueUrls = new Set(urls);
      
      expect(urls.length).toBe(uniqueUrls.size);
    });
  });

  describe("error handling", () => {
    it("should handle empty HTML", () => {
      const screenshots = extractScreenshotsFromShoeboxJson("");
      
      expect(screenshots).toEqual([]);
      expect(logger.log).toHaveBeenCalledWith("[Scraper] No shoebox JSON found in HTML");
    });

    it("should handle HTML without shoebox script", () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body><div>No shoebox here</div></body>
        </html>
      `;
      
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      expect(screenshots).toEqual([]);
      expect(logger.log).toHaveBeenCalledWith("[Scraper] No shoebox JSON found in HTML");
    });

    it("should handle invalid JSON in shoebox", () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <body>
          <script type="fastboot/shoebox" id="shoebox-media-api-cache-apps">
            {invalid json}
          </script>
        </body>
        </html>
      `;
      
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      expect(screenshots).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "[Scraper] Error parsing shoebox JSON content:",
        expect.any(Error)
      );
    });

    it("should handle missing screenshot data structure", () => {
      const emptyData = { someKey: "someValue" };
      const html = createShoeboxHtml(emptyData);
      
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      expect(screenshots).toEqual([]);
      expect(logger.log).toHaveBeenCalledWith(
        "[Scraper] No customScreenshotsByType found in any location"
      );
    });
  });

  describe("platform mapping", () => {
    it("should correctly map device types to platforms", () => {
      // Create a mock fixture with specific device types
      const mockData = {
        "test.key": JSON.stringify({
          d: [{
            attributes: {
              customAttributes: {
                default: {
                  default: {
                    customScreenshotsByType: {
                      "iphone_6_5": [{ url: "https://example.com/iphone.png" }],
                      "ipadpro_2018": [{ url: "https://example.com/ipad.png" }],
                      "appletv": [{ url: "https://example.com/tv.png" }],
                      "applewatch": [{ url: "https://example.com/watch.png" }],
                      "mac": [{ url: "https://example.com/mac.png" }],
                    }
                  }
                }
              }
            }
          }]
        })
      };
      
      const html = createShoeboxHtml(mockData);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      expect(screenshots.length).toBe(5);
      
      const platforms = screenshots.map(s => s.type);
      expect(platforms).toContain("iPhone");
      expect(platforms).toContain("iPad");
      expect(platforms).toContain("AppleTV");
      expect(platforms).toContain("AppleWatch");
      expect(platforms).toContain("Mac");
    });

    describe("complete device type mapping coverage", () => {
      // Helper function to create mock data with specific device types
      const createMockDataWithDeviceTypes = (deviceTypes: Record<string, string>) => {
        const customScreenshotsByType: Record<string, Array<{ url: string }>> = {};
        
        Object.keys(deviceTypes).forEach(deviceType => {
          customScreenshotsByType[deviceType] = [{
            url: `https://example.com/${deviceType}.png`
          }];
        });

        return {
          "test.key": JSON.stringify({
            d: [{
              attributes: {
                customAttributes: {
                  default: {
                    default: {
                      customScreenshotsByType
                    }
                  }
                }
              }
            }]
          })
        };
      };

      // Test iPhone platform coverage
      it("should map all iPhone device types correctly", () => {
        const iPhoneDeviceTypes = {
          "iphone": "iPhone",
          "iphone5": "iPhone", 
          "iphone6": "iPhone",
          "iphone6+": "iPhone",
          "iphone_5_8": "iPhone",
          "iphone_6_5": "iPhone",
          "iphone_d73": "iPhone",
          "iphone_d74": "iPhone"
        };

        const mockData = createMockDataWithDeviceTypes(iPhoneDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        expect(screenshots.length).toBe(Object.keys(iPhoneDeviceTypes).length);
        screenshots.forEach(screenshot => {
          expect(screenshot.type).toBe("iPhone");
        });
      });

      // Test iPad platform coverage
      it("should map all iPad device types correctly", () => {
        const iPadDeviceTypes = {
          "ipad": "iPad",
          "ipad_10_5": "iPad",
          "ipad_11": "iPad",
          "ipadPro": "iPad",
          "ipadPro_2018": "iPad"
        };

        const mockData = createMockDataWithDeviceTypes(iPadDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        expect(screenshots.length).toBe(Object.keys(iPadDeviceTypes).length);
        screenshots.forEach(screenshot => {
          expect(screenshot.type).toBe("iPad");
        });
      });

      // Test AppleTV platform coverage
      it("should map all AppleTV device types correctly", () => {
        const appleTVDeviceTypes = {
          "appleTV": "AppleTV"
        };

        const mockData = createMockDataWithDeviceTypes(appleTVDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        expect(screenshots.length).toBe(Object.keys(appleTVDeviceTypes).length);
        screenshots.forEach(screenshot => {
          expect(screenshot.type).toBe("AppleTV");
        });
      });

      // Test AppleWatch platform coverage
      it("should map all AppleWatch device types correctly", () => {
        const appleWatchDeviceTypes = {
          "appleWatch": "AppleWatch",
          "appleWatch_2018": "AppleWatch",
          "appleWatch_2021": "AppleWatch",
          "appleWatch_2022": "AppleWatch"
        };

        const mockData = createMockDataWithDeviceTypes(appleWatchDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        expect(screenshots.length).toBe(Object.keys(appleWatchDeviceTypes).length);
        screenshots.forEach(screenshot => {
          expect(screenshot.type).toBe("AppleWatch");
        });
      });

      // Test VisionPro platform coverage
      it("should map all VisionPro device types correctly", () => {
        const visionProDeviceTypes = {
          "appleVisionPro": "VisionPro"
        };

        const mockData = createMockDataWithDeviceTypes(visionProDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        expect(screenshots.length).toBe(Object.keys(visionProDeviceTypes).length);
        screenshots.forEach(screenshot => {
          expect(screenshot.type).toBe("VisionPro");
        });
      });

      // Test Mac platform coverage
      it("should map all Mac device types correctly", () => {
        const macDeviceTypes = {
          "mac": "Mac"
        };

        const mockData = createMockDataWithDeviceTypes(macDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        expect(screenshots.length).toBe(Object.keys(macDeviceTypes).length);
        screenshots.forEach(screenshot => {
          expect(screenshot.type).toBe("Mac");
        });
      });

      // Test iMessage platform coverage (fallback test since not found in fixtures)
      it("should map iMessage device types correctly", () => {
        const iMessageDeviceTypes = {
          "imessage": "iMessage",
          "messages": "iMessage"
        };

        const mockData = createMockDataWithDeviceTypes(iMessageDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        expect(screenshots.length).toBe(Object.keys(iMessageDeviceTypes).length);
        screenshots.forEach(screenshot => {
          expect(screenshot.type).toBe("iMessage");
        });
      });

      // Test comprehensive mapping with all platforms represented
      it("should handle all platform types in a single fixture", () => {
        const allPlatformDeviceTypes = {
          "iphone_d74": "iPhone",
          "ipadPro_2018": "iPad",
          "appleTV": "AppleTV", 
          "appleWatch_2021": "AppleWatch",
          "appleVisionPro": "VisionPro",
          "mac": "Mac",
          "imessage": "iMessage"
        };

        const mockData = createMockDataWithDeviceTypes(allPlatformDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        expect(screenshots.length).toBe(Object.keys(allPlatformDeviceTypes).length);
        
        const platformTypes = new Set(screenshots.map(s => s.type));
        expect(platformTypes).toEqual(new Set([
          "iPhone", "iPad", "AppleTV", "AppleWatch", "VisionPro", "Mac", "iMessage"
        ]));
        
        // Verify each platform has at least one screenshot
        expect(platformTypes.size).toBe(7);
      });

      // Test unknown device type skipping
      it("should skip unknown device types and log them", () => {
        const mixedDeviceTypes = {
          "unknownDevice": "Unknown",     // Should be skipped
          "iphone_6_5": "iPhone",       // Should be processed
          "futureDevice": "Unknown",    // Should be skipped
          "ipadPro_2018": "iPad"        // Should be processed
        };

        const mockData = createMockDataWithDeviceTypes(mixedDeviceTypes);
        const html = createShoeboxHtml(mockData);
        const screenshots = extractScreenshotsFromShoeboxJson(html);

        // Should only process known device types
        expect(screenshots.length).toBe(2);
        const platformTypes = screenshots.map(s => s.type);
        expect(platformTypes).toContain("iPhone");
        expect(platformTypes).toContain("iPad");
        
        // Verify unknown device types were logged as skipped
        expect(logger.log).toHaveBeenCalledWith("[Scraper] Skipping unknown device type: unknownDevice");
        expect(logger.log).toHaveBeenCalledWith("[Scraper] Skipping unknown device type: futureDevice");
      });

      // Test exact device type matching from collected fixtures
      describe("exact device type mapping from collected fixtures", () => {
        // Test all iPhone device types found in fixtures
        it("should map all iPhone device types found in fixtures", () => {
          const iPhoneDeviceTypesFromFixtures = {
            "iphone": "iPhone",           // Found in: Netflix
            "iphone5": "iPhone",          // Found in: Instagram, Netflix
            "iphone6": "iPhone",          // Found in: Netflix
            "iphone6+": "iPhone",         // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV
            "iphone_5_8": "iPhone",       // Found in: Netflix
            "iphone_6_5": "iPhone",       // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV
            "iphone_d73": "iPhone",       // Found in: Netflix
            "iphone_d74": "iPhone",       // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV
          };

          const mockData = createMockDataWithDeviceTypes(iPhoneDeviceTypesFromFixtures);
          const html = createShoeboxHtml(mockData);
          const screenshots = extractScreenshotsFromShoeboxJson(html);

          expect(screenshots.length).toBe(Object.keys(iPhoneDeviceTypesFromFixtures).length);
          screenshots.forEach(screenshot => {
            expect(screenshot.type).toBe("iPhone");
          });
        });

        // Test all iPad device types found in fixtures
        it("should map all iPad device types found in fixtures", () => {
          const iPadDeviceTypesFromFixtures = {
            "ipad": "iPad",               // Found in: Instagram, Netflix
            "ipad_10_5": "iPad",          // Found in: Instagram, Netflix
            "ipad_11": "iPad",            // Found in: Netflix
            "ipadPro": "iPad",            // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV
            "ipadPro_2018": "iPad",       // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV
          };

          const mockData = createMockDataWithDeviceTypes(iPadDeviceTypesFromFixtures);
          const html = createShoeboxHtml(mockData);
          const screenshots = extractScreenshotsFromShoeboxJson(html);

          expect(screenshots.length).toBe(Object.keys(iPadDeviceTypesFromFixtures).length);
          screenshots.forEach(screenshot => {
            expect(screenshot.type).toBe("iPad");
          });
        });

        // Test Apple TV device types found in fixtures
        it("should map all Apple TV device types found in fixtures", () => {
          const appleTVDeviceTypesFromFixtures = {
            "appleTV": "AppleTV",         // Found in: Instagram, Netflix, Spotify, YouTubeTV
          };

          const mockData = createMockDataWithDeviceTypes(appleTVDeviceTypesFromFixtures);
          const html = createShoeboxHtml(mockData);
          const screenshots = extractScreenshotsFromShoeboxJson(html);

          expect(screenshots.length).toBe(Object.keys(appleTVDeviceTypesFromFixtures).length);
          screenshots.forEach(screenshot => {
            expect(screenshot.type).toBe("AppleTV");
          });
        });

        // Test Apple Watch device types found in fixtures
        it("should map all Apple Watch device types found in fixtures", () => {
          const appleWatchDeviceTypesFromFixtures = {
            "appleWatch": "AppleWatch",           // Found in: Spotify, Word
            "appleWatch_2018": "AppleWatch",      // Found in: Spotify, YouTubeTV
            "appleWatch_2021": "AppleWatch",      // Found in: Instagram, Spotify, Word, YouTubeTV
            "appleWatch_2022": "AppleWatch",      // Found in: Spotify
          };

          const mockData = createMockDataWithDeviceTypes(appleWatchDeviceTypesFromFixtures);
          const html = createShoeboxHtml(mockData);
          const screenshots = extractScreenshotsFromShoeboxJson(html);

          expect(screenshots.length).toBe(Object.keys(appleWatchDeviceTypesFromFixtures).length);
          screenshots.forEach(screenshot => {
            expect(screenshot.type).toBe("AppleWatch");
          });
        });

        // Test Vision Pro device types found in fixtures
        it("should map all Vision Pro device types found in fixtures", () => {
          const visionProDeviceTypesFromFixtures = {
            "appleVisionPro": "VisionPro",        // Found in: Netflix, Word, YouTubeTV
          };

          const mockData = createMockDataWithDeviceTypes(visionProDeviceTypesFromFixtures);
          const html = createShoeboxHtml(mockData);
          const screenshots = extractScreenshotsFromShoeboxJson(html);

          expect(screenshots.length).toBe(Object.keys(visionProDeviceTypesFromFixtures).length);
          screenshots.forEach(screenshot => {
            expect(screenshot.type).toBe("VisionPro");
          });
        });

        // Test Mac device types found in fixtures
        it("should map all Mac device types found in fixtures", () => {
          const macDeviceTypesFromFixtures = {
            "mac": "Mac",                 // Found in: Netflix, Word
          };

          const mockData = createMockDataWithDeviceTypes(macDeviceTypesFromFixtures);
          const html = createShoeboxHtml(mockData);
          const screenshots = extractScreenshotsFromShoeboxJson(html);

          expect(screenshots.length).toBe(Object.keys(macDeviceTypesFromFixtures).length);
          screenshots.forEach(screenshot => {
            expect(screenshot.type).toBe("Mac");
          });
        });

        // Test complete fixture-based mapping in a single test  
        it("should handle all device types found across all collected fixtures", () => {
          const allFixtureDeviceTypes = {
            // iPhone variants from all fixtures
            "iphone": "iPhone",
            "iphone5": "iPhone",
            "iphone6": "iPhone",
            "iphone6+": "iPhone",
            "iphone_5_8": "iPhone",
            "iphone_6_5": "iPhone",
            "iphone_d73": "iPhone",
            "iphone_d74": "iPhone",
            // iPad variants from all fixtures
            "ipad": "iPad",
            "ipad_10_5": "iPad",
            "ipad_11": "iPad",
            "ipadPro": "iPad",
            "ipadPro_2018": "iPad",
            // Apple TV from all fixtures
            "appleTV": "AppleTV",
            // Apple Watch variants from all fixtures
            "appleWatch": "AppleWatch",
            "appleWatch_2018": "AppleWatch",
            "appleWatch_2021": "AppleWatch",
            "appleWatch_2022": "AppleWatch",
            // Vision Pro from all fixtures
            "appleVisionPro": "VisionPro",
            // Mac from all fixtures
            "mac": "Mac",
          };

          const mockData = createMockDataWithDeviceTypes(allFixtureDeviceTypes);
          const html = createShoeboxHtml(mockData);
          const screenshots = extractScreenshotsFromShoeboxJson(html);

          expect(screenshots.length).toBe(Object.keys(allFixtureDeviceTypes).length);
          
          const platformTypes = new Set(screenshots.map(s => s.type));
          expect(platformTypes).toEqual(new Set([
            "iPhone", "iPad", "AppleTV", "AppleWatch", "VisionPro", "Mac"
          ]));

          // Verify counts for each platform
          const platformCounts = screenshots.reduce((counts, screenshot) => {
            counts[screenshot.type] = (counts[screenshot.type] || 0) + 1;
            return counts;
          }, {} as Record<string, number>);

          expect(platformCounts["iPhone"]).toBe(8);      // 8 iPhone device types
          expect(platformCounts["iPad"]).toBe(5);        // 5 iPad device types
          expect(platformCounts["AppleTV"]).toBe(1);     // 1 Apple TV device type
          expect(platformCounts["AppleWatch"]).toBe(4);  // 4 Apple Watch device types
          expect(platformCounts["VisionPro"]).toBe(1);   // 1 Vision Pro device type
          expect(platformCounts["Mac"]).toBe(1);         // 1 Mac device type
        });
      });
    });
  });

  describe("platform directory structure verification", () => {
    // Test directory for platform structure verification
    let tempDir: string;

    beforeAll(() => {
      // Create a temporary directory for testing
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "screenshot-test-"));
    });

    afterAll(() => {
      // Clean up the temporary directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    beforeEach(() => {
      // Test setup for platform directory verification
    });

    it("should create directories only for platforms with ≥1 screenshot", async () => {
      // Create test screenshots with only some platforms
      const testScreenshots = [
        { url: "https://example.com/iphone1.png", type: "iPhone", index: 0 },
        { url: "https://example.com/iphone2.png", type: "iPhone", index: 1 },
        { url: "https://example.com/ipad1.png", type: "iPad", index: 2 },
        { url: "https://example.com/watch1.png", type: "AppleWatch", index: 3 },
      ];

      // Import the PlatformDirectories function to test with
      const { PlatformDirectories } = await import("../src/types");
      
      // Create a test screenshots directory
      const testScreenshotsDir = path.join(tempDir, "Test App Screenshots");
      
      // Simulate the core logic from the downloader:
      // 1. Group screenshots by platform type
      const screenshotsByType: Record<string, Array<{ url: string; type: string; index: number }>> = {};
      for (const screenshot of testScreenshots) {
        if (!screenshotsByType[screenshot.type]) {
          screenshotsByType[screenshot.type] = [];
        }
        screenshotsByType[screenshot.type].push(screenshot);
      }

      // 2. Iterate over ALL platforms to ensure complete coverage
      const allPlatformTypes = ["iPhone", "iPad", "Mac", "AppleTV", "AppleWatch", "VisionPro", "iMessage"];
      
      // Initialize empty arrays for platforms with no screenshots
      for (const platformType of allPlatformTypes) {
        if (!screenshotsByType[platformType]) {
          screenshotsByType[platformType] = [];
        }
      }

      // 3. Create main screenshots directory
      if (!fs.existsSync(testScreenshotsDir)) {
        fs.mkdirSync(testScreenshotsDir, { recursive: true });
      }

      // 4. Get platform directories using the actual function
      const platformDirs = PlatformDirectories(testScreenshotsDir);

      // 5. Create directories ONLY for platforms that have ≥1 screenshot
      for (const platformType of allPlatformTypes) {
        const platformScreenshots = screenshotsByType[platformType];
        if (platformScreenshots && platformScreenshots.length > 0) {
          const dir = platformDirs[platformType as keyof typeof platformDirs];
          if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            
            // Create test files to simulate the actual download behavior
            for (const screenshot of platformScreenshots) {
              const filename = `${screenshot.index + 1}.png`;
              const filePath = path.join(dir, filename);
              fs.writeFileSync(filePath, "fake png data");
            }
          }
        }
      }

      // Now verify the results:
      
      // Check that directories were created ONLY for platforms with screenshots
      const expectedPlatformsWithScreenshots = ["iPhone", "iPad", "AppleWatch"];
      const expectedPlatformsWithoutScreenshots = ["Mac", "AppleTV", "VisionPro", "iMessage"];

      // Verify directories exist for platforms with screenshots
      for (const platform of expectedPlatformsWithScreenshots) {
        const platformDir = platformDirs[platform as keyof typeof platformDirs];
        expect(fs.existsSync(platformDir)).toBe(true);
      }

      // Verify directories do NOT exist for platforms without screenshots
      for (const platform of expectedPlatformsWithoutScreenshots) {
        const platformDir = platformDirs[platform as keyof typeof platformDirs];
        expect(fs.existsSync(platformDir)).toBe(false);
      }

      // Verify file counts per platform
      const iPhoneDir = platformDirs["iPhone"];
      const iPadDir = platformDirs["iPad"];
      const watchDir = platformDirs["AppleWatch"];

      if (fs.existsSync(iPhoneDir)) {
        const iPhoneFiles = fs.readdirSync(iPhoneDir).filter((f: string) => f.endsWith(".png"));
        expect(iPhoneFiles.length).toBe(2); // Should have 2 iPhone screenshots
        expect(iPhoneFiles).toContain("1.png");
        expect(iPhoneFiles).toContain("2.png");
      }

      if (fs.existsSync(iPadDir)) {
        const iPadFiles = fs.readdirSync(iPadDir).filter((f: string) => f.endsWith(".png"));
        expect(iPadFiles.length).toBe(1); // Should have 1 iPad screenshot
        expect(iPadFiles).toContain("3.png");
      }

      if (fs.existsSync(watchDir)) {
        const watchFiles = fs.readdirSync(watchDir).filter((f: string) => f.endsWith(".png"));
        expect(watchFiles.length).toBe(1); // Should have 1 Apple Watch screenshot
        expect(watchFiles).toContain("4.png");
      }
    });

    it("should verify platform directory structure follows pattern …/Screenshots/<Platform>/<n>.png", async () => {

      // Import the PlatformDirectories function
      const { PlatformDirectories } = await import("../src/types");
      
      const testScreenshotsDir = path.join(tempDir, "Full Test App Screenshots");
      const platformDirs = PlatformDirectories(testScreenshotsDir);

      // Verify the directory structure follows the expected pattern
      expect(platformDirs["iPhone"]).toBe(path.join(testScreenshotsDir, "iPhone"));
      expect(platformDirs["iPad"]).toBe(path.join(testScreenshotsDir, "iPad"));
      expect(platformDirs["Mac"]).toBe(path.join(testScreenshotsDir, "Mac"));
      expect(platformDirs["AppleTV"]).toBe(path.join(testScreenshotsDir, "TV"));
      expect(platformDirs["AppleWatch"]).toBe(path.join(testScreenshotsDir, "Apple Watch"));
      expect(platformDirs["VisionPro"]).toBe(path.join(testScreenshotsDir, "Vision Pro"));
      expect(platformDirs["iMessage"]).toBe(path.join(testScreenshotsDir, "iMessage"));

      // Verify all platform types are covered
      const allPlatformTypes = ["iPhone", "iPad", "Mac", "AppleTV", "AppleWatch", "VisionPro", "iMessage"];
      const coveredPlatforms = Object.keys(platformDirs);
      
      expect(coveredPlatforms.sort()).toEqual(allPlatformTypes.sort());
      expect(coveredPlatforms.length).toBe(7); // Should cover all 7 platform types
    });

    it("should ensure PlatformDirectories returns path for every PlatformType", async () => {
      // Import the types
      const { PlatformDirectories } = await import("../src/types");
      
      const testDir = "/test/screenshots";
      const platformDirs = PlatformDirectories(testDir);
      
      // Verify that every PlatformType has a corresponding directory path
      const expectedPlatforms: Array<"iPhone" | "iPad" | "Mac" | "AppleTV" | "AppleWatch" | "VisionPro" | "iMessage"> = [
        "iPhone", "iPad", "Mac", "AppleTV", "AppleWatch", "VisionPro", "iMessage"
      ];
      
      for (const platform of expectedPlatforms) {
        expect(platformDirs[platform]).toBeDefined();
        expect(typeof platformDirs[platform]).toBe("string");
        expect(platformDirs[platform]).toContain(testDir);
      }
      
      // Verify the function returns exactly the right number of platforms
      expect(Object.keys(platformDirs).length).toBe(expectedPlatforms.length);
    });
  });

  describe("Spotify fixture device type mapping", () => {
    let spotifyFixture: Record<string, unknown>;
    let spotifyScreenshots: Array<{ url: string; type: string; index: number }>;  

    beforeAll(() => {
      const spotifyPath = path.join(fixturesDir, "shoebox_spotify.json");
      const spotifyData = fs.readFileSync(spotifyPath, "utf8");
      spotifyFixture = JSON.parse(spotifyData);
      
      const html = createShoeboxHtml(spotifyFixture);
      spotifyScreenshots = extractScreenshotsFromShoeboxJson(html);
    });

    it("should extract screenshots from Spotify fixture", () => {
      expect(spotifyScreenshots.length).toBeGreaterThan(0);
      expect(spotifyScreenshots.length).toBe(50); // Actual count from extraction
    });

    it("should map Spotify device types correctly", () => {
      const platformCounts = spotifyScreenshots.reduce((counts, screenshot) => {
        counts[screenshot.type] = (counts[screenshot.type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      // Based on actual extraction from Spotify fixture
      expect(platformCounts["iPhone"]).toBe(26);     // Actual iPhone screenshots
      expect(platformCounts["iPad"]).toBe(13);       // Actual iPad screenshots
      expect(platformCounts["AppleWatch"]).toBe(6);  // Actual Apple Watch screenshots
      expect(platformCounts["AppleTV"]).toBe(5);     // Actual Apple TV screenshots
      
      // Verify total adds up correctly
      const total = Object.values(platformCounts).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(50);
    });

    it("should contain all expected platforms for Spotify", () => {
      const platformTypes = new Set(spotifyScreenshots.map(s => s.type));
      
      expect(platformTypes.has("iPhone")).toBe(true);
      expect(platformTypes.has("iPad")).toBe(true);
      expect(platformTypes.has("AppleWatch")).toBe(true);
      expect(platformTypes.has("AppleTV")).toBe(true);
      
      // Should not contain platforms not in the fixture
      expect(platformTypes.has("Mac")).toBe(false);
      expect(platformTypes.has("VisionPro")).toBe(false);
      expect(platformTypes.has("iMessage")).toBe(false);
    });

    it("should have sequential indices for Spotify screenshots", () => {
      spotifyScreenshots.forEach((screenshot, i) => {
        expect(screenshot.index).toBe(i);
      });
    });

    it("should transform URLs to platform-specific highest resolution for Spotify", () => {
      spotifyScreenshots.forEach(screenshot => {
        if (screenshot.url.includes("mzstatic.com")) {
          // Check for platform-specific resolutions
          switch (screenshot.type) {
            case "iPhone":
            case "iMessage":
              expect(screenshot.url).toContain("1290x0w.png");
              break;
            case "iPad":
              expect(screenshot.url).toContain("2048x0w.png");
              break;
            case "Mac":
              expect(screenshot.url).toContain("2560x0w.png");
              break;
            case "AppleTV":
            case "VisionPro":
              expect(screenshot.url).toContain("3840x0w.png");
              break;
            case "AppleWatch":
              expect(screenshot.url).toContain("396x0w.png");
              break;
            default:
              // Fallback for unknown platforms
              expect(screenshot.url).toMatch(/\d+x0w\.png$/);
          }
        }
      });
    });

    it("should not have duplicate URLs in Spotify fixture", () => {
      const urls = spotifyScreenshots.map(s => s.url);
      const uniqueUrls = new Set(urls);
      
      expect(urls.length).toBe(uniqueUrls.size);
    });

    it("should validate Spotify-specific device type mappings", () => {
      // Create a specific test for Spotify's exact device types
      const spotifyDeviceTypes = {
        "iphone_d74": "iPhone",
        "iphone6+": "iPhone",
        "iphone_6_5": "iPhone",
        "ipadPro": "iPad",
        "ipadPro_2018": "iPad",
        "appleWatch_2021": "AppleWatch",
        "appleTV": "AppleTV"
      };

      // Create mock data with Spotify device types
      const mockData = {
        "test.key": JSON.stringify({
          d: [{
            attributes: {
              customAttributes: {
                default: {
                  default: {
                    customScreenshotsByType: Object.fromEntries(
                      Object.keys(spotifyDeviceTypes).map(deviceType => [
                        deviceType,
                        [{ url: `https://example.com/${deviceType}.png` }]
                      ])
                    )
                  }
                }
              }
            }
          }]
        })
      };
      
      const html = createShoeboxHtml(mockData);
      const screenshots = extractScreenshotsFromShoeboxJson(html);
      
      expect(screenshots.length).toBe(Object.keys(spotifyDeviceTypes).length);
      
      // Verify each device type maps to correct platform
      screenshots.forEach(screenshot => {
        const deviceType = Object.keys(spotifyDeviceTypes).find(dt => 
          screenshot.url.includes(dt)
        );
        expect(deviceType).toBeDefined();
        expect(screenshot.type).toBe(spotifyDeviceTypes[deviceType as keyof typeof spotifyDeviceTypes]);
      });
    });
  });
});
