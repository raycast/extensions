import {
  DJANGO_DOCS_BASE_URL,
  SITEMAP_URL,
  getUrlPatternsForVersion,
  DJANGO_VERSIONS,
  DjangoVersion,
} from "../constants";

describe("constants", () => {
  describe("DJANGO_DOCS_BASE_URL", () => {
    it("should export the correct base URL", () => {
      expect(DJANGO_DOCS_BASE_URL).toBe("https://docs.djangoproject.com");
    });

    it("should be a valid URL", () => {
      expect(() => new URL(DJANGO_DOCS_BASE_URL)).not.toThrow();
    });
  });

  describe("SITEMAP_URL", () => {
    it("should export the correct sitemap URL", () => {
      expect(SITEMAP_URL).toBe("https://docs.djangoproject.com/sitemap-en.xml");
    });

    it("should be a valid URL", () => {
      expect(() => new URL(SITEMAP_URL)).not.toThrow();
    });

    it("should include the base URL", () => {
      expect(SITEMAP_URL).toContain(DJANGO_DOCS_BASE_URL);
    });
  });

  describe("getUrlPatternsForVersion", () => {
    describe("dev version patterns", () => {
      const patterns = getUrlPatternsForVersion("dev");

      describe("topics pattern", () => {
        it("should match valid topics URLs", () => {
          const validUrls = [
            "https://docs.djangoproject.com/en/dev/topics/auth/",
            "https://docs.djangoproject.com/en/dev/topics/db/",
            "https://docs.djangoproject.com/en/dev/topics/http",
          ];

          validUrls.forEach((url) => {
            expect(patterns.topics.test(url)).toBe(true);
          });
        });

        it("should not match topics sub-level URLs", () => {
          const invalidUrls = [
            "https://docs.djangoproject.com/en/dev/topics/auth/default/",
            "https://docs.djangoproject.com/en/dev/topics/db/models/",
          ];

          invalidUrls.forEach((url) => {
            expect(patterns.topics.test(url)).toBe(false);
          });
        });

        it("should not match non-topics URLs", () => {
          const invalidUrls = [
            "https://docs.djangoproject.com/en/dev/ref/auth/",
            "https://docs.djangoproject.com/en/dev/intro/",
            "https://docs.djangoproject.com/",
          ];

          invalidUrls.forEach((url) => {
            expect(patterns.topics.test(url)).toBe(false);
          });
        });

        it("should not match URLs with trailing segments", () => {
          expect(patterns.topics.test("https://docs.djangoproject.com/en/dev/topics/auth/default/")).toBe(false);
        });
      });

      describe("topicsSub pattern", () => {
        it("should match valid topics sub-level URLs", () => {
          const validUrls = [
            "https://docs.djangoproject.com/en/dev/topics/auth/default/",
            "https://docs.djangoproject.com/en/dev/topics/db/models/",
            "https://docs.djangoproject.com/en/dev/topics/http/urls",
          ];

          validUrls.forEach((url) => {
            expect(patterns.topicsSub.test(url)).toBe(true);
          });
        });

        it("should not match top-level topics URLs", () => {
          const invalidUrls = [
            "https://docs.djangoproject.com/en/dev/topics/auth/",
            "https://docs.djangoproject.com/en/dev/topics/db/",
          ];

          invalidUrls.forEach((url) => {
            expect(patterns.topicsSub.test(url)).toBe(false);
          });
        });

        it("should not match deeper nesting levels", () => {
          const invalidUrl = "https://docs.djangoproject.com/en/dev/topics/auth/default/extra/";
          expect(patterns.topicsSub.test(invalidUrl)).toBe(false);
        });
      });

      describe("ref pattern", () => {
        it("should match valid ref URLs", () => {
          const validUrls = [
            "https://docs.djangoproject.com/en/dev/ref/contrib/admin/",
            "https://docs.djangoproject.com/en/dev/ref/forms/api/",
            "https://docs.djangoproject.com/en/dev/ref/models/fields",
          ];

          validUrls.forEach((url) => {
            expect(patterns.ref.test(url)).toBe(true);
          });
        });

        it("should not match ref sub-level URLs", () => {
          const invalidUrls = [
            "https://docs.djangoproject.com/en/dev/ref/contrib/admin/actions/",
            "https://docs.djangoproject.com/en/dev/ref/forms/api/forms/",
          ];

          invalidUrls.forEach((url) => {
            expect(patterns.ref.test(url)).toBe(false);
          });
        });

        it("should not match single-level ref URLs", () => {
          const invalidUrl = "https://docs.djangoproject.com/en/dev/ref/models/";
          expect(patterns.ref.test(invalidUrl)).toBe(false);
        });

        it("should not match non-ref URLs", () => {
          const invalidUrls = [
            "https://docs.djangoproject.com/en/dev/topics/auth/",
            "https://docs.djangoproject.com/en/dev/intro/",
          ];

          invalidUrls.forEach((url) => {
            expect(patterns.ref.test(url)).toBe(false);
          });
        });
      });

      describe("refSub pattern", () => {
        it("should match valid ref sub-level URLs", () => {
          const validUrls = [
            "https://docs.djangoproject.com/en/dev/ref/contrib/admin/actions/",
            "https://docs.djangoproject.com/en/dev/ref/forms/api/forms/",
            "https://docs.djangoproject.com/en/dev/ref/models/fields/extra",
          ];

          validUrls.forEach((url) => {
            expect(patterns.refSub.test(url)).toBe(true);
          });
        });

        it("should not match two-level ref URLs", () => {
          const invalidUrls = [
            "https://docs.djangoproject.com/en/dev/ref/contrib/admin/",
            "https://docs.djangoproject.com/en/dev/ref/forms/api/",
          ];

          invalidUrls.forEach((url) => {
            expect(patterns.refSub.test(url)).toBe(false);
          });
        });

        it("should not match deeper nesting levels", () => {
          const invalidUrl = "https://docs.djangoproject.com/en/dev/ref/contrib/admin/actions/extra/more/";
          expect(patterns.refSub.test(invalidUrl)).toBe(false);
        });
      });

      describe("pattern properties", () => {
        it("should contain all expected pattern keys", () => {
          expect(Object.keys(patterns)).toEqual(["topics", "topicsSub", "ref", "refSub"]);
        });

        it("should have all patterns as RegExp instances", () => {
          Object.values(patterns).forEach((pattern) => {
            expect(pattern).toBeInstanceOf(RegExp);
          });
        });
      });

      describe("trailing slash handling", () => {
        it("should match URLs with or without trailing slashes", () => {
          expect(patterns.topics.test("https://docs.djangoproject.com/en/dev/topics/auth/")).toBe(true);
          expect(patterns.topics.test("https://docs.djangoproject.com/en/dev/topics/auth")).toBe(true);

          expect(patterns.ref.test("https://docs.djangoproject.com/en/dev/ref/contrib/admin/")).toBe(true);
          expect(patterns.ref.test("https://docs.djangoproject.com/en/dev/ref/contrib/admin")).toBe(true);
        });
      });
    });

    describe("version-specific patterns", () => {
      it("should generate patterns for version 6.0", () => {
        const patterns = getUrlPatternsForVersion("6.0");
        expect(patterns.topics.test("https://docs.djangoproject.com/en/6.0/topics/auth/")).toBe(true);
        expect(patterns.topics.test("https://docs.djangoproject.com/en/dev/topics/auth/")).toBe(false);
      });

      it("should generate patterns for version 5.1", () => {
        const patterns = getUrlPatternsForVersion("5.1");
        expect(patterns.topics.test("https://docs.djangoproject.com/en/5.1/topics/auth/")).toBe(true);
        expect(patterns.topics.test("https://docs.djangoproject.com/en/6.0/topics/auth/")).toBe(false);
      });

      it("should generate patterns for version 4.2", () => {
        const patterns = getUrlPatternsForVersion("4.2");
        expect(patterns.ref.test("https://docs.djangoproject.com/en/4.2/ref/contrib/admin/")).toBe(true);
        expect(patterns.ref.test("https://docs.djangoproject.com/en/5.0/ref/contrib/admin/")).toBe(false);
      });

      it("should not match URLs from different versions", () => {
        const patterns60 = getUrlPatternsForVersion("6.0");
        const patterns51 = getUrlPatternsForVersion("5.1");

        const url60 = "https://docs.djangoproject.com/en/6.0/topics/auth/";
        const url51 = "https://docs.djangoproject.com/en/5.1/topics/auth/";

        expect(patterns60.topics.test(url60)).toBe(true);
        expect(patterns60.topics.test(url51)).toBe(false);
        expect(patterns51.topics.test(url51)).toBe(true);
        expect(patterns51.topics.test(url60)).toBe(false);
      });
    });
  });

  describe("DJANGO_VERSIONS", () => {
    it("should export an array of version strings", () => {
      expect(Array.isArray(DJANGO_VERSIONS)).toBe(true);
      expect(DJANGO_VERSIONS.length).toBeGreaterThan(0);
    });

    it("should contain expected version strings", () => {
      expect(DJANGO_VERSIONS).toEqual(["dev", "6.0", "5.2", "5.1", "5.0", "4.2"]);
    });

    it("should include dev version", () => {
      expect(DJANGO_VERSIONS).toContain("dev");
    });

    it("has readonly type at compile time", () => {
      const versions = DJANGO_VERSIONS;
      expect(Object.isFrozen(versions)).toBe(false);

      const typedVersion: DjangoVersion = "dev";
      expect(DJANGO_VERSIONS).toContain(typedVersion);
    });

    it("should have all version strings in correct format", () => {
      DJANGO_VERSIONS.forEach((version) => {
        expect(typeof version).toBe("string");
        expect(version.length).toBeGreaterThan(0);
      });
    });
  });

  describe("DjangoVersion type", () => {
    it("should accept valid Django version strings", () => {
      const version1: DjangoVersion = "dev";
      const version2: DjangoVersion = "6.0";
      const version3: DjangoVersion = "5.2";
      const version4: DjangoVersion = "5.1";
      const version5: DjangoVersion = "5.0";
      const version6: DjangoVersion = "4.2";

      expect([version1, version2, version3, version4, version5, version6]).toEqual([
        "dev",
        "6.0",
        "5.2",
        "5.1",
        "5.0",
        "4.2",
      ]);
    });
  });
});
