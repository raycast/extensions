import TurndownService from "turndown";
import * as cheerio from "cheerio";
import { createTurndownService, removeHeaderLinks, stripPilcrows, resolveRelativeUrls } from "../html-to-markdown";

jest.mock("turndown");

describe("html-to-markdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createTurndownService", () => {
    it("should create a TurndownService with correct configuration", () => {
      const mockService = {
        addRule: jest.fn(),
      };
      (TurndownService as jest.MockedClass<typeof TurndownService>).mockImplementation(
        () => mockService as unknown as TurndownService,
      );

      createTurndownService();

      expect(TurndownService).toHaveBeenCalledWith({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
      });
    });

    it("should add a custom rule for code blocks", () => {
      const mockService = {
        addRule: jest.fn(),
      };
      (TurndownService as jest.MockedClass<typeof TurndownService>).mockImplementation(
        () => mockService as unknown as TurndownService,
      );

      createTurndownService();

      expect(mockService.addRule).toHaveBeenCalledWith("codeBlocks", expect.any(Object));
      const ruleConfig = mockService.addRule.mock.calls[0][1];
      expect(ruleConfig.filter).toEqual(["pre"]);
      expect(typeof ruleConfig.replacement).toBe("function");
    });

    it("should format code blocks with language identifier using raw textContent", () => {
      const mockService = {
        addRule: jest.fn(),
      };
      (TurndownService as jest.MockedClass<typeof TurndownService>).mockImplementation(
        () => mockService as unknown as TurndownService,
      );

      createTurndownService();

      const ruleConfig = mockService.addRule.mock.calls[0][1];
      const mockNode = document.createElement("pre");
      const codeElement = document.createElement("code");
      codeElement.className = "language-python";
      codeElement.textContent = "print('hello')";
      mockNode.appendChild(codeElement);

      const result = ruleConfig.replacement("escaped\\_content", mockNode);

      expect(result).toBe("\n```python\nprint('hello')\n```\n");
    });

    it("should format code blocks without language when no class is present", () => {
      const mockService = {
        addRule: jest.fn(),
      };
      (TurndownService as jest.MockedClass<typeof TurndownService>).mockImplementation(
        () => mockService as unknown as TurndownService,
      );

      createTurndownService();

      const ruleConfig = mockService.addRule.mock.calls[0][1];
      const mockNode = document.createElement("pre");
      const codeElement = document.createElement("code");
      codeElement.textContent = "console.log('test')";
      mockNode.appendChild(codeElement);

      const result = ruleConfig.replacement("escaped", mockNode);

      expect(result).toBe("\n```\nconsole.log('test')\n```\n");
    });

    it("should handle pre elements without code children", () => {
      const mockService = {
        addRule: jest.fn(),
      };
      (TurndownService as jest.MockedClass<typeof TurndownService>).mockImplementation(
        () => mockService as unknown as TurndownService,
      );

      createTurndownService();

      const ruleConfig = mockService.addRule.mock.calls[0][1];
      const mockNode = document.createElement("pre");
      mockNode.textContent = "plain text";

      const result = ruleConfig.replacement("escaped", mockNode);

      expect(result).toBe("\n```\nplain text\n```\n");
    });

    it("should extract language from various language class formats", () => {
      const mockService = {
        addRule: jest.fn(),
      };
      (TurndownService as jest.MockedClass<typeof TurndownService>).mockImplementation(
        () => mockService as unknown as TurndownService,
      );

      createTurndownService();

      const ruleConfig = mockService.addRule.mock.calls[0][1];

      const testCases = [
        { className: "language-javascript", expected: "javascript" },
        { className: "language-typescript", expected: "typescript" },
        { className: "language-python3", expected: "python3" },
        { className: "highlight language-bash", expected: "bash" },
      ];

      testCases.forEach(({ className, expected }) => {
        const mockNode = document.createElement("pre");
        const codeElement = document.createElement("code");
        codeElement.className = className;
        codeElement.textContent = "code";
        mockNode.appendChild(codeElement);

        const result = ruleConfig.replacement("escaped", mockNode);

        expect(result).toBe(`\n\`\`\`${expected}\ncode\n\`\`\`\n`);
      });
    });

    it("should return the created service instance", () => {
      const mockService = {
        addRule: jest.fn(),
      };
      (TurndownService as jest.MockedClass<typeof TurndownService>).mockImplementation(
        () => mockService as unknown as TurndownService,
      );

      const result = createTurndownService();

      expect(result).toBe(mockService);
    });
  });

  describe("removeHeaderLinks", () => {
    it("should remove all elements with class headerlink", () => {
      const html = '<h2>Title<a class="headerlink" href="#title">¶</a></h2>';
      const $ = cheerio.load(html);

      removeHeaderLinks($);

      expect($("a.headerlink").length).toBe(0);
      expect($("h2").html()).toBe("Title");
    });

    it("should remove all elements with class pilcrow", () => {
      const html = '<h2>Title<a class="pilcrow" href="#title">¶</a></h2>';
      const $ = cheerio.load(html);

      removeHeaderLinks($);

      expect($("a.pilcrow").length).toBe(0);
      expect($("h2").html()).toBe("Title");
    });

    it("should remove multiple headerlink elements", () => {
      const html = `
        <h2>Title 1<a class="headerlink" href="#title1">¶</a></h2>
        <h3>Title 2<a class="headerlink" href="#title2">¶</a></h3>
        <h4>Title 3<a class="headerlink" href="#title3">¶</a></h4>
      `;
      const $ = cheerio.load(html);

      removeHeaderLinks($);

      expect($("a.headerlink").length).toBe(0);
      expect($("h2").text()).toBe("Title 1");
      expect($("h3").text()).toBe("Title 2");
      expect($("h4").text()).toBe("Title 3");
    });

    it("should remove multiple pilcrow elements", () => {
      const html = `
        <h2>Title 1<a class="pilcrow" href="#title1">¶</a></h2>
        <h3>Title 2<a class="pilcrow" href="#title2">¶</a></h3>
      `;
      const $ = cheerio.load(html);

      removeHeaderLinks($);

      expect($("a.pilcrow").length).toBe(0);
    });

    it("should remove both headerlink and pilcrow elements", () => {
      const html = `
        <h2>Title 1<a class="headerlink" href="#title1">¶</a></h2>
        <h3>Title 2<a class="pilcrow" href="#title2">¶</a></h3>
      `;
      const $ = cheerio.load(html);

      removeHeaderLinks($);

      expect($("a.headerlink").length).toBe(0);
      expect($("a.pilcrow").length).toBe(0);
    });

    it("should not remove other anchor elements", () => {
      const html = `
        <h2>Title<a class="headerlink" href="#title">¶</a></h2>
        <p><a href="#section">Link to section</a></p>
        <a class="normal-link" href="/page">Normal link</a>
      `;
      const $ = cheerio.load(html);

      removeHeaderLinks($);

      expect($("a").length).toBe(2);
      expect($('a[href="#section"]').length).toBe(1);
      expect($('a[href="/page"]').length).toBe(1);
    });

    it("should handle empty document", () => {
      const html = "";
      const $ = cheerio.load(html);

      expect(() => removeHeaderLinks($)).not.toThrow();
    });

    it("should handle document with no header links", () => {
      const html = "<h2>Title</h2><p>Content</p>";
      const $ = cheerio.load(html);

      removeHeaderLinks($);

      expect($("h2").text()).toBe("Title");
      expect($("p").text()).toBe("Content");
    });
  });

  describe("stripPilcrows", () => {
    it("should remove single pilcrow character", () => {
      const text = "Title¶";
      const result = stripPilcrows(text);
      expect(result).toBe("Title");
    });

    it("should remove multiple pilcrow characters", () => {
      const text = "Title¶ Section¶ Subsection¶";
      const result = stripPilcrows(text);
      expect(result).toBe("Title Section Subsection");
    });

    it("should handle text without pilcrows", () => {
      const text = "Title Section Subsection";
      const result = stripPilcrows(text);
      expect(result).toBe("Title Section Subsection");
    });

    it("should handle empty string", () => {
      const text = "";
      const result = stripPilcrows(text);
      expect(result).toBe("");
    });

    it("should handle string with only pilcrows", () => {
      const text = "¶¶¶";
      const result = stripPilcrows(text);
      expect(result).toBe("");
    });

    it("should preserve other special characters", () => {
      const text = "Title¶ with special chars: @#$%^&*()";
      const result = stripPilcrows(text);
      expect(result).toBe("Title with special chars: @#$%^&*()");
    });

    it("should handle pilcrows at different positions", () => {
      const text = "¶Start Middle¶ End¶";
      const result = stripPilcrows(text);
      expect(result).toBe("Start Middle End");
    });

    it("should handle consecutive pilcrows", () => {
      const text = "Title¶¶¶Content";
      const result = stripPilcrows(text);
      expect(result).toBe("TitleContent");
    });
  });

  describe("resolveRelativeUrls", () => {
    const baseUrl = "https://docs.djangoproject.com/en/5.0/";

    describe("anchor links", () => {
      it("should resolve relative anchor URLs to absolute URLs", () => {
        const html = '<a href="topics/db/models/">Models</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://docs.djangoproject.com/en/5.0/topics/db/models/");
      });

      it("should not modify absolute HTTP URLs", () => {
        const html = '<a href="https://example.com/page">External</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://example.com/page");
      });

      it("should not modify absolute HTTPS URLs", () => {
        const html = '<a href="https://secure.example.com/page">Secure</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://secure.example.com/page");
      });

      it("should not modify fragment identifiers", () => {
        const html = '<a href="#section">Jump to section</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("#section");
      });

      it("should not modify mailto links", () => {
        const html = '<a href="mailto:test@example.com">Email</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("mailto:test@example.com");
      });

      it("should resolve multiple relative anchor URLs", () => {
        const html = `
          <a href="topics/db/models/">Models</a>
          <a href="ref/settings/">Settings</a>
          <a href="https://example.com">External</a>
        `;
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").eq(0).attr("href")).toBe("https://docs.djangoproject.com/en/5.0/topics/db/models/");
        expect($("a").eq(1).attr("href")).toBe("https://docs.djangoproject.com/en/5.0/ref/settings/");
        expect($("a").eq(2).attr("href")).toBe("https://example.com");
      });

      it("should handle anchors without href attribute", () => {
        const html = "<a>No href</a>";
        const $ = cheerio.load(html);

        expect(() => resolveRelativeUrls($, baseUrl)).not.toThrow();
      });

      it("should resolve parent directory references", () => {
        const html = '<a href="../topics/models/">Models</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://docs.djangoproject.com/en/topics/models/");
      });

      it("should resolve current directory references", () => {
        const html = '<a href="./models/">Models</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://docs.djangoproject.com/en/5.0/models/");
      });

      it("should handle root-relative URLs", () => {
        const html = '<a href="/static/css/style.css">Styles</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://docs.djangoproject.com/static/css/style.css");
      });
    });

    describe("image sources", () => {
      it("should resolve relative image URLs to absolute URLs", () => {
        const html = '<img src="images/logo.png" alt="Logo" />';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("img").attr("src")).toBe("https://docs.djangoproject.com/en/5.0/images/logo.png");
      });

      it("should not modify absolute HTTP image URLs", () => {
        const html = '<img src="http://example.com/image.png" alt="External" />';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("img").attr("src")).toBe("http://example.com/image.png");
      });

      it("should not modify absolute HTTPS image URLs", () => {
        const html = '<img src="https://cdn.example.com/image.png" alt="CDN" />';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("img").attr("src")).toBe("https://cdn.example.com/image.png");
      });

      it("should not modify data URIs", () => {
        const dataUri =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        const html = `<img src="${dataUri}" alt="Data" />`;
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("img").attr("src")).toBe(dataUri);
      });

      it("should resolve multiple relative image URLs", () => {
        const html = `
          <img src="images/logo.png" alt="Logo" />
          <img src="icons/icon.svg" alt="Icon" />
          <img src="https://cdn.example.com/banner.jpg" alt="Banner" />
        `;
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("img").eq(0).attr("src")).toBe("https://docs.djangoproject.com/en/5.0/images/logo.png");
        expect($("img").eq(1).attr("src")).toBe("https://docs.djangoproject.com/en/5.0/icons/icon.svg");
        expect($("img").eq(2).attr("src")).toBe("https://cdn.example.com/banner.jpg");
      });

      it("should handle images without src attribute", () => {
        const html = '<img alt="No src" />';
        const $ = cheerio.load(html);

        expect(() => resolveRelativeUrls($, baseUrl)).not.toThrow();
      });

      it("should resolve parent directory references in images", () => {
        const html = '<img src="../images/logo.png" alt="Logo" />';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("img").attr("src")).toBe("https://docs.djangoproject.com/en/images/logo.png");
      });

      it("should resolve current directory references in images", () => {
        const html = '<img src="./images/logo.png" alt="Logo" />';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("img").attr("src")).toBe("https://docs.djangoproject.com/en/5.0/images/logo.png");
      });

      it("should handle root-relative image URLs", () => {
        const html = '<img src="/static/images/logo.png" alt="Logo" />';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("img").attr("src")).toBe("https://docs.djangoproject.com/static/images/logo.png");
      });
    });

    describe("mixed content", () => {
      it("should resolve both relative anchor and image URLs in the same document", () => {
        const html = `
          <a href="topics/models/">Models</a>
          <img src="images/logo.png" alt="Logo" />
          <a href="https://example.com">External</a>
          <img src="https://cdn.example.com/icon.png" alt="Icon" />
        `;
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").eq(0).attr("href")).toBe("https://docs.djangoproject.com/en/5.0/topics/models/");
        expect($("img").eq(0).attr("src")).toBe("https://docs.djangoproject.com/en/5.0/images/logo.png");
        expect($("a").eq(1).attr("href")).toBe("https://example.com");
        expect($("img").eq(1).attr("src")).toBe("https://cdn.example.com/icon.png");
      });

      it("should handle empty document", () => {
        const html = "";
        const $ = cheerio.load(html);

        expect(() => resolveRelativeUrls($, baseUrl)).not.toThrow();
      });

      it("should handle document with no links or images", () => {
        const html = "<h1>Title</h1><p>Content</p>";
        const $ = cheerio.load(html);

        expect(() => resolveRelativeUrls($, baseUrl)).not.toThrow();
      });
    });

    describe("edge cases", () => {
      it("should handle baseUrl without trailing slash", () => {
        const html = '<a href="topics/models/">Models</a>';
        const $ = cheerio.load(html);
        const baseUrlNoSlash = "https://docs.djangoproject.com/en/5.0";

        resolveRelativeUrls($, baseUrlNoSlash);

        expect($("a").attr("href")).toBe("https://docs.djangoproject.com/en/topics/models/");
      });

      it("should handle complex relative paths", () => {
        const html = '<a href="../../ref/models/fields/">Fields</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://docs.djangoproject.com/ref/models/fields/");
      });

      it("should handle query parameters in relative URLs", () => {
        const html = '<a href="search/?q=test">Search</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://docs.djangoproject.com/en/5.0/search/?q=test");
      });

      it("should handle fragments in relative URLs", () => {
        const html = '<a href="topics/models/#model-methods">Methods</a>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("a").attr("href")).toBe("https://docs.djangoproject.com/en/5.0/topics/models/#model-methods");
      });

      it("should not resolve empty href attributes", () => {
        const html = '<div><a id="test-anchor" href="">Empty</a></div>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("#test-anchor").attr("href")).toBe("");
      });

      it("should not resolve empty src attributes", () => {
        const html = '<div><img id="test-img" src="" alt="Empty" /></div>';
        const $ = cheerio.load(html);

        resolveRelativeUrls($, baseUrl);

        expect($("#test-img").attr("src")).toBe("");
      });
    });
  });
});
