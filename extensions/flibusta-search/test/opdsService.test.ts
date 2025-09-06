import { searchBooks } from "../src/services/opdsService";
import axios from "axios";
import * as xml2js from "xml2js";

jest.mock("axios");
jest.mock("xml2js");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedXml2js = xml2js as jest.Mocked<typeof xml2js>;

describe("opdsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchBooks", () => {
    it("should return empty array when query is empty", async () => {
      const result = await searchBooks("");
      expect(result).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should fetch and parse books from OPDS catalog", async () => {
      const mockXml = `
        <?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Test Book</title>
            <author>
              <name>Test Author</name>
              <uri>/a/123</uri>
            </author>
            <category term="Fiction" label="Fiction" />
            <dc:language>en</dc:language>
            <dc:format>fb2+zip</dc:format>
            <dc:issued>2024</dc:issued>
            <content>Test description</content>
            <link href="/b/123/fb2" rel="http://opds-spec.org/acquisition/open-access" type="application/fb2+zip" />
          </entry>
        </feed>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: mockXml });
      mockedXml2js.Parser.prototype.parseStringPromise.mockResolvedValueOnce({
        feed: {
          entry: [
            {
              title: "Test Book",
              author: {
                name: "Test Author",
                uri: "/a/123",
              },
              category: [
                {
                  term: "Fiction",
                  label: "Fiction",
                },
              ],
              "dc:language": "en",
              "dc:format": "fb2+zip",
              "dc:issued": "2024",
              content: "Test description",
              link: [
                {
                  href: "/b/123/fb2",
                  rel: "http://opds-spec.org/acquisition/open-access",
                  type: "application/fb2+zip",
                },
              ],
            },
          ],
        },
      });

      const result = await searchBooks("test");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        title: "Test Book",
        author: {
          name: "Test Author",
          uri: "/a/123",
        },
        categories: [
          {
            term: "Fiction",
            label: "Fiction",
          },
        ],
        language: "en",
        format: "fb2+zip",
        issued: "2024",
        description: "Test description",
        downloadLinks: {
          fb2: "/b/123/fb2",
        },
      });
    });
  });
});
