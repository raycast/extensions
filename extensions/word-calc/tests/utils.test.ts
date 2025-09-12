import {
  cleanTextForWordCount,
  countParagraphs,
  analyzeTextStatic,
  calculateTimeEstimates,
  formatTime,
} from '../src/utils';

describe('cleanTextForWordCount', () => {
  test('removes HTML tags', () => {
    const input = '<p>Hello <strong>world</strong>!</p>';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Hello world !'); // HTML tags are replaced with spaces, then normalized
  });

  test('removes Markdown formatting', () => {
    const input = '**Bold** text and *italic* text';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Bold text and italic text');
  });

  test('removes Markdown headers', () => {
    const input = '# Header 1\n## Header 2\nRegular text';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Header 1 Header 2 Regular text');
  });

  test('removes Markdown links', () => {
    const input = 'Check out [Google](https://google.com) for search.';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Check out Google for search.');
  });

  test('removes code blocks', () => {
    const input = 'Here is some ```javascript\nconsole.log("hello");\n``` code.';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Here is some code.');
  });

  test('keeps inline code content', () => {
    const input = 'Use `console.log` to debug.';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Use console.log to debug.');
  });

  test('removes URLs', () => {
    const input = 'Visit https://example.com for more info.';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Visit for more info.');
  });

  test('removes email addresses', () => {
    const input = 'Contact me at test@example.com for questions.';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Contact me at for questions.');
  });

  test('normalizes whitespace', () => {
    const input = 'Too    many   spaces\n\nand\n\nlines.';
    const result = cleanTextForWordCount(input);
    expect(result).toBe('Too many spaces and lines.');
  });

  test('handles empty string', () => {
    const result = cleanTextForWordCount('');
    expect(result).toBe('');
  });

  test('handles complex mixed content', () => {
    const input = `
# My Blog Post

Visit my **website** at [example.com](https://example.com).

Here's some code:
\`\`\`javascript
function hello() {
  console.log("Hello world!");
}
\`\`\`

Contact me at test@example.com or visit https://github.com/user.

- List item 1
- List item 2

> This is a quote

The end.
    `;
    const result = cleanTextForWordCount(input);
    expect(result).toContain('My Blog Post');
    expect(result).toContain('Visit my website at example.com');
    expect(result).toContain('List item 1');
    expect(result).toContain('This is a quote');
    expect(result).toContain('The end.');
    expect(result).not.toContain('```');
    expect(result).not.toContain('https://');
    expect(result).not.toContain('@');
  });
});

describe('countParagraphs', () => {
  test('counts HTML paragraphs', () => {
    const input = '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>';
    const result = countParagraphs(input);
    expect(result).toBe(3);
  });

  test('counts paragraphs separated by double line breaks', () => {
    const input = 'First paragraph\n\nSecond paragraph\n\nThird paragraph';
    const result = countParagraphs(input);
    expect(result).toBe(3);
  });

  test('counts paragraphs with single line breaks', () => {
    const input = 'This is a substantial first paragraph with enough content\nThis is a substantial second paragraph with enough content\nThis is a substantial third paragraph with enough content';
    const result = countParagraphs(input);
    expect(result).toBe(3);
  });

  test('ignores short lines', () => {
    const input = 'This is a substantial first paragraph with enough content\nShort\nThis is a substantial second paragraph with enough content';
    const result = countParagraphs(input);
    expect(result).toBe(2);
  });

  test('ignores list markers', () => {
    const input = 'This is a substantial paragraph\n- Item 1\n* Item 2\n+ Item 3\n1. Number\nAnother substantial paragraph';
    const result = countParagraphs(input);
    expect(result).toBe(2);
  });

  test('returns 1 for single paragraph', () => {
    const input = 'This is just one paragraph with some content.';
    const result = countParagraphs(input);
    expect(result).toBe(1);
  });

  test('returns 0 for empty string', () => {
    const result = countParagraphs('');
    expect(result).toBe(0);
  });

  test('returns 0 for whitespace only', () => {
    const result = countParagraphs('   \n\n\t   ');
    expect(result).toBe(0);
  });

  test('handles mixed HTML and text', () => {
    const input = '<p>HTML paragraph</p>\n\nPlain text paragraph';
    const result = countParagraphs(input);
    expect(result).toBe(1); // HTML takes precedence
  });
});

describe('formatTime', () => {
  test('formats seconds correctly', () => {
    expect(formatTime(0.5)).toBe('30 secs');
    expect(formatTime(0.0166)).toBe('1 sec');
    expect(formatTime(0.033)).toBe('2 secs');
  });

  test('formats minutes without seconds', () => {
    expect(formatTime(1)).toBe('1 min');
    expect(formatTime(2)).toBe('2 mins');
    expect(formatTime(5)).toBe('5 mins');
  });

  test('formats minutes with seconds', () => {
    expect(formatTime(1.5)).toBe('1m 30s');
    expect(formatTime(2.25)).toBe('2m 15s');
    expect(formatTime(5.75)).toBe('5m 45s');
  });

  test('handles edge cases', () => {
    expect(formatTime(0)).toBe('0 secs');
    expect(formatTime(0.9999)).toBe('60 secs'); // rounds to 60 seconds
    expect(formatTime(1.01)).toBe('1m 1s');
  });
});

describe('analyzeTextStatic', () => {
  test('analyzes plain text correctly', () => {
    const input = 'Hello world! This is a test.';
    const result = analyzeTextStatic(input);
    
    expect(result.wordCount).toBe(6);
    expect(result.characterCount).toBe(28);
    expect(result.characterCountNoSpaces).toBe(23);
    expect(result.paragraphCount).toBe(1);
    expect(result.cleanedText).toBe('Hello world! This is a test.');
  });

  test('analyzes markdown text correctly', () => {
    const input = '# Title\n\n**Bold** text with *italic*.\n\nSecond paragraph.';
    const result = analyzeTextStatic(input);
    
    expect(result.wordCount).toBe(7); // Title Bold text with italic Second paragraph
    expect(result.paragraphCount).toBe(3); // Title, first paragraph, second paragraph
    expect(result.cleanedText).toContain('Title');
    expect(result.cleanedText).toContain('Bold text with italic');
    expect(result.cleanedText).not.toContain('**');
    expect(result.cleanedText).not.toContain('*');
  });

  test('analyzes HTML text correctly', () => {
    const input = '<p>First paragraph</p><p>Second <strong>paragraph</strong></p>';
    const result = analyzeTextStatic(input);
    
    expect(result.wordCount).toBe(4); // First paragraph Second paragraph
    expect(result.paragraphCount).toBe(2);
    expect(result.cleanedText).toBe('First paragraph Second paragraph');
  });

  test('handles empty string', () => {
    const result = analyzeTextStatic('');
    
    expect(result.wordCount).toBe(0);
    expect(result.characterCount).toBe(0);
    expect(result.characterCountNoSpaces).toBe(0);
    expect(result.paragraphCount).toBe(0);
    expect(result.cleanedText).toBe('');
  });

  test('analyzes complex mixed content', () => {
    const input = `
# Blog Post Title

This is the **first paragraph** with [a link](https://example.com).

\`\`\`javascript
// This code should be ignored for word count
function test() { return true; }
\`\`\`

This is the second paragraph with \`inline code\`.

- List item one
- List item two

Final paragraph here.
    `;
    
    const result = analyzeTextStatic(input);
    
    expect(result.wordCount).toBeGreaterThan(10);
    expect(result.paragraphCount).toBeGreaterThan(1);
    expect(result.cleanedText).toContain('Blog Post Title');
    expect(result.cleanedText).toContain('first paragraph');
    expect(result.cleanedText).toContain('inline code');
    expect(result.cleanedText).not.toContain('```');
    expect(result.cleanedText).not.toContain('function test');
  });
});

describe('calculateTimeEstimates', () => {
  test('calculates reading and speaking times correctly', () => {
    const staticAnalysis = {
      wordCount: 200,
      characterCount: 1000,
      characterCountNoSpaces: 800,
      paragraphCount: 2,
      cleanedText: 'test content'
    };
    
    const result = calculateTimeEstimates(staticAnalysis, 200, 150);
    
    expect(result.readingTime).toBe('1 min'); // 200 words at 200 WPM = 1 minute
    expect(result.speakingTime).toBe('1m 20s'); // 200 words at 150 WPM = 1.33 minutes
  });

  test('handles small word counts', () => {
    const staticAnalysis = {
      wordCount: 50,
      characterCount: 250,
      characterCountNoSpaces: 200,
      paragraphCount: 1,
      cleanedText: 'short content'
    };
    
    const result = calculateTimeEstimates(staticAnalysis, 200, 150);
    
    expect(result.readingTime).toBe('15 secs'); // 50 words at 200 WPM = 0.25 minutes = 15 seconds
    expect(result.speakingTime).toBe('20 secs'); // 50 words at 150 WPM = 0.33 minutes = 20 seconds
  });

  test('handles large word counts', () => {
    const staticAnalysis = {
      wordCount: 1000,
      characterCount: 5000,
      characterCountNoSpaces: 4000,
      paragraphCount: 10,
      cleanedText: 'long content'
    };
    
    const result = calculateTimeEstimates(staticAnalysis, 200, 150);
    
    expect(result.readingTime).toBe('5 mins'); // 1000 words at 200 WPM = 5 minutes
    expect(result.speakingTime).toBe('6m 40s'); // 1000 words at 150 WPM = 6.67 minutes
  });

  test('handles zero words', () => {
    const staticAnalysis = {
      wordCount: 0,
      characterCount: 0,
      characterCountNoSpaces: 0,
      paragraphCount: 0,
      cleanedText: ''
    };
    
    const result = calculateTimeEstimates(staticAnalysis, 200, 150);
    
    expect(result.readingTime).toBe('0 secs');
    expect(result.speakingTime).toBe('0 secs');
  });
});
