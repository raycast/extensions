import { SearchResult } from "../types";

export const mockSearchResult: SearchResult = {
  id: "http://arxiv.org/abs/2301.12345",
  published: "2023-01-15T10:30:00Z",
  updated: "2023-01-20T14:00:00Z",
  title: "Deep Learning for Natural Language Processing: A Survey",
  summary: "This paper provides a comprehensive survey of deep learning techniques for NLP.",
  authors: ["John Doe", "Jane Smith", "Bob Johnson"],
  category: "cs.CL, cs.AI",
  link: "http://arxiv.org/pdf/2301.12345v1",
  abstractUrl: "https://arxiv.org/abs/2301.12345",
  pdfUrl: "http://arxiv.org/pdf/2301.12345v1",
  texUrl: "https://arxiv.org/e-print/2301.12345",
  htmlUrl: "https://ar5iv.org/abs/2301.12345",
  doi: "10.1234/example.doi",
  comment: "Accepted at ICML 2023",
  journalRef: "Proceedings of ICML 2023",
};

export const mockSearchResultNoAuthors: SearchResult = {
  ...mockSearchResult,
  authors: [],
};

export const mockSearchResultSingleAuthor: SearchResult = {
  ...mockSearchResult,
  authors: ["Alice Wilson"],
};

export const mockSearchResultTwoAuthors: SearchResult = {
  ...mockSearchResult,
  authors: ["Alice Wilson", "Bob Brown"],
};

export const mockSearchResultManyAuthors: SearchResult = {
  ...mockSearchResult,
  authors: [
    "Author One",
    "Author Two",
    "Author Three",
    "Author Four",
    "Author Five",
    "Author Six",
    "Author Seven",
    "Author Eight",
    "Author Nine",
    "Author Ten",
  ],
};

export const mockSearchResultNoDOI: SearchResult = {
  ...mockSearchResult,
  doi: undefined,
};

export const mockSearchResultNoJournal: SearchResult = {
  ...mockSearchResult,
  journalRef: undefined,
};

export const mockSearchResultOldFormat: SearchResult = {
  ...mockSearchResult,
  id: "http://arxiv.org/abs/math.GT/0605123",
};

export const mockSearchResultSpecialChars: SearchResult = {
  ...mockSearchResult,
  title: 'Machine Learning & Deep Learning: <Theory> and "Practice"',
  authors: ["José García-López", "François D'Alembert", "Müller-Schmidt"],
};

export const mockXMLResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.12345</id>
    <updated>2023-01-20T14:00:00Z</updated>
    <published>2023-01-15T10:30:00Z</published>
    <title>Deep Learning for Natural Language Processing: A Survey</title>
    <summary>This paper provides a comprehensive survey of deep learning techniques for NLP.</summary>
    <author>
      <name>John Doe</name>
    </author>
    <author>
      <name>Jane Smith</name>
    </author>
    <author>
      <name>Bob Johnson</name>
    </author>
    <arxiv:doi xmlns:arxiv="http://arxiv.org/schemas/atom">10.1234/example.doi</arxiv:doi>
    <arxiv:comment xmlns:arxiv="http://arxiv.org/schemas/atom">Accepted at ICML 2023</arxiv:comment>
    <arxiv:journal_ref xmlns:arxiv="http://arxiv.org/schemas/atom">Proceedings of ICML 2023</arxiv:journal_ref>
    <link href="http://arxiv.org/pdf/2301.12345v1" rel="related" type="application/pdf" />
    <category term="cs.CL" />
    <category term="cs.AI" />
  </entry>
</feed>`;

export const mockXMLResponseEmpty = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
</feed>`;

export const mockXMLResponseMalformed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>incomplete entry without closing tag
</feed>`;

export const mockXMLResponseMissingFields = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.99999</id>
    <published>2023-01-15T10:30:00Z</published>
    <title>Paper Without Authors or Summary</title>
    <category term="cs.LG" />
  </entry>
</feed>`;
