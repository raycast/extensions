import { describe, it, expect } from "vitest";

// Mock the Book interface
interface Book {
  title: string;
  author: string;
  isbn: string;
  price: number;
  shipping: number;
  dealer: string;
  platform: string;
  link: string;
  condition?: string;
}

// Copy of the parseEurobuchXML function to test
const parseEurobuchXML = (xml: string): Book[] => {
  const books: Book[] = [];
  const bookRegex = /<Book\s+([^>]*?)\s*\/>/g;
  let match: RegExpExecArray | null;

  // Helper to decode XML entities
  const decodeXMLEntities = (str: string): string => {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  };

  while ((match = bookRegex.exec(xml)) !== null) {
    const getAttribute = (name: string): string => {
      const regex = new RegExp(`${name}="([^"]*)"`, "i");
      const value = regex.exec(match[1])?.[1] || "";
      return decodeXMLEntities(value);
    };

    const priceStr = getAttribute("price") || getAttribute("priceeur");
    const shippingStr = getAttribute("versandkosten_eur");

    const book: Book = {
      title: getAttribute("title"),
      author: getAttribute("author"),
      isbn: getAttribute("isbn"),
      price: parseFloat(priceStr.replace(",", ".")) || 0,
      shipping: parseFloat(shippingStr.replace(",", ".")) || 0,
      dealer: getAttribute("dealer"),
      platform: getAttribute("platform"),
      link: getAttribute("url"),
      condition: getAttribute("condition"),
    };

    if (book.title && book.link) {
      books.push(book);
    }
  }

  return books;
};

describe("parseEurobuchXML", () => {
  describe("Basic Parsing", () => {
    it("should parse a single book entry correctly", () => {
      const xml = `
        <Books>
          <Book title="Test Book" author="Test Author" isbn="9783161484100" 
                price="12.99" versandkosten_eur="2.50" dealer="Test Dealer" 
                platform="TestPlatform" url="https://example.com/book1" 
                condition="new" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books).toHaveLength(1);
      expect(books[0]).toEqual({
        title: "Test Book",
        author: "Test Author",
        isbn: "9783161484100",
        price: 12.99,
        shipping: 2.5,
        dealer: "Test Dealer",
        platform: "TestPlatform",
        link: "https://example.com/book1",
        condition: "new",
      });
    });

    it("should parse multiple book entries", () => {
      const xml = `
        <Books>
          <Book title="Book One" author="Author One" isbn="1111111111" 
                price="10.00" versandkosten_eur="2.00" dealer="Dealer1" 
                platform="Platform1" url="https://example.com/book1" />
          <Book title="Book Two" author="Author Two" isbn="2222222222" 
                price="15.00" versandkosten_eur="3.00" dealer="Dealer2" 
                platform="Platform2" url="https://example.com/book2" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books).toHaveLength(2);
      expect(books[0].title).toBe("Book One");
      expect(books[1].title).toBe("Book Two");
    });
  });

  describe("Price Parsing", () => {
    it("should handle comma decimal separators", () => {
      const xml = `
        <Books>
          <Book title="Test" author="Test" isbn="123" 
                price="12,99" versandkosten_eur="2,50" dealer="Test" 
                platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].price).toBe(12.99);
      expect(books[0].shipping).toBe(2.5);
    });

    it("should handle dot decimal separators", () => {
      const xml = `
        <Books>
          <Book title="Test" author="Test" isbn="123" 
                price="12.99" versandkosten_eur="2.50" dealer="Test" 
                platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].price).toBe(12.99);
      expect(books[0].shipping).toBe(2.5);
    });

    it("should default to 0 for missing prices", () => {
      const xml = `
        <Books>
          <Book title="Test" author="Test" isbn="123" 
                dealer="Test" platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].price).toBe(0);
      expect(books[0].shipping).toBe(0);
    });

    it("should handle priceeur as alternative to price", () => {
      const xml = `
        <Books>
          <Book title="Test" author="Test" isbn="123" 
                priceeur="19.99" versandkosten_eur="3.50" dealer="Test" 
                platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].price).toBe(19.99);
    });

    it("should prioritize price over priceeur", () => {
      const xml = `
        <Books>
          <Book title="Test" author="Test" isbn="123" 
                price="12.99" priceeur="19.99" versandkosten_eur="2.50" 
                dealer="Test" platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].price).toBe(12.99);
    });
  });

  describe("Missing Fields", () => {
    it("should handle missing author", () => {
      const xml = `
        <Books>
          <Book title="Test Book" isbn="123" price="10.00" 
                versandkosten_eur="2.00" dealer="Test" platform="Test" 
                url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].author).toBe("");
    });

    it("should handle missing ISBN", () => {
      const xml = `
        <Books>
          <Book title="Test Book" author="Test Author" price="10.00" 
                versandkosten_eur="2.00" dealer="Test" platform="Test" 
                url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].isbn).toBe("");
    });

    it("should handle missing condition", () => {
      const xml = `
        <Books>
          <Book title="Test Book" author="Test Author" isbn="123" 
                price="10.00" versandkosten_eur="2.00" dealer="Test" 
                platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].condition).toBe("");
    });
  });

  describe("Validation", () => {
    it("should skip books without title", () => {
      const xml = `
        <Books>
          <Book author="Test Author" isbn="123" price="10.00" 
                versandkosten_eur="2.00" dealer="Test" platform="Test" 
                url="https://example.com/book" />
          <Book title="Valid Book" author="Test" isbn="456" price="15.00" 
                versandkosten_eur="3.00" dealer="Test" platform="Test" 
                url="https://example.com/book2" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books).toHaveLength(1);
      expect(books[0].title).toBe("Valid Book");
    });

    it("should skip books without URL", () => {
      const xml = `
        <Books>
          <Book title="No URL Book" author="Test" isbn="123" price="10.00" 
                versandkosten_eur="2.00" dealer="Test" platform="Test" />
          <Book title="Valid Book" author="Test" isbn="456" price="15.00" 
                versandkosten_eur="3.00" dealer="Test" platform="Test" 
                url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books).toHaveLength(1);
      expect(books[0].title).toBe("Valid Book");
    });
  });

  describe("Special Characters", () => {
    it("should decode XML entities in title", () => {
      const xml = `
        <Books>
          <Book title="Test &amp; Book: &quot;Special&quot; Characters" author="Test" 
                isbn="123" price="10.00" versandkosten_eur="2.00" dealer="Test" 
                platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      // XML entities should be decoded
      expect(books[0].title).toBe('Test & Book: "Special" Characters');
    });

    it("should handle umlauts and special characters", () => {
      const xml = `
        <Books>
          <Book title="Über Äpfel und Öl" author="Müller" isbn="123" 
                price="10.00" versandkosten_eur="2.00" dealer="Händler" 
                platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].title).toBe("Über Äpfel und Öl");
      expect(books[0].author).toBe("Müller");
      expect(books[0].dealer).toBe("Händler");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty XML", () => {
      const xml = "";
      const books = parseEurobuchXML(xml);
      expect(books).toHaveLength(0);
    });

    it("should handle XML with no books", () => {
      const xml = "<Books></Books>";
      const books = parseEurobuchXML(xml);
      expect(books).toHaveLength(0);
    });

    it("should handle very long attribute values", () => {
      const longTitle = "A".repeat(1000);
      const xml = `
        <Books>
          <Book title="${longTitle}" author="Test" isbn="123" 
                price="10.00" versandkosten_eur="2.00" dealer="Test" 
                platform="Test" url="https://example.com/book" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books[0].title).toBe(longTitle);
    });

    it("should handle multiple spaces in attributes", () => {
      const xml = `
        <Books>
          <Book    title="Test Book"   author="Test Author"    isbn="123" 
                price="10.00"    versandkosten_eur="2.00"    dealer="Test" 
                platform="Test"    url="https://example.com/book"    />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books).toHaveLength(1);
      expect(books[0].title).toBe("Test Book");
    });
  });

  describe("Real-World Examples", () => {
    it("should parse realistic Eurobuch response", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Books>
          <Book title="Harry Potter und der Stein der Weisen" 
                author="Rowling, J.K." 
                isbn="9783551551672" 
                price="12,99" 
                versandkosten_eur="2,95" 
                dealer="Buchhandlung Beispiel" 
                platform="ZVAB" 
                url="https://www.zvab.com/servlet/BookDetailsPL?qid=abc123" 
                condition="gut" />
          <Book title="Harry Potter und der Stein der Weisen" 
                author="Rowling, J.K." 
                isbn="9783551551672" 
                priceeur="14.50" 
                versandkosten_eur="0.00" 
                dealer="Amazon Marketplace" 
                platform="Amazon" 
                url="https://www.amazon.de/dp/B00123" 
                condition="Wie neu" />
        </Books>
      `;

      const books = parseEurobuchXML(xml);

      expect(books).toHaveLength(2);

      // First book
      expect(books[0].title).toBe("Harry Potter und der Stein der Weisen");
      expect(books[0].author).toBe("Rowling, J.K.");
      expect(books[0].isbn).toBe("9783551551672");
      expect(books[0].price).toBe(12.99);
      expect(books[0].shipping).toBe(2.95);
      expect(books[0].condition).toBe("gut");

      // Second book
      expect(books[1].price).toBe(14.5);
      expect(books[1].shipping).toBe(0);
      expect(books[1].condition).toBe("Wie neu");
    });
  });
});

describe("Book Sorting", () => {
  it("should sort books by total price (price + shipping)", () => {
    const books: Book[] = [
      {
        title: "Expensive Book",
        author: "Author",
        isbn: "111",
        price: 20,
        shipping: 5,
        dealer: "Dealer1",
        platform: "Platform1",
        link: "https://example.com/1",
      },
      {
        title: "Cheap Book",
        author: "Author",
        isbn: "222",
        price: 10,
        shipping: 2,
        dealer: "Dealer2",
        platform: "Platform2",
        link: "https://example.com/2",
      },
      {
        title: "Medium Book",
        author: "Author",
        isbn: "333",
        price: 15,
        shipping: 3,
        dealer: "Dealer3",
        platform: "Platform3",
        link: "https://example.com/3",
      },
    ];

    const sorted = books.sort((a, b) => a.price + a.shipping - (b.price + b.shipping));

    expect(sorted[0].title).toBe("Cheap Book"); // 12 total
    expect(sorted[1].title).toBe("Medium Book"); // 18 total
    expect(sorted[2].title).toBe("Expensive Book"); // 25 total
  });
});

// Export for use in actual test environment
export { parseEurobuchXML };
