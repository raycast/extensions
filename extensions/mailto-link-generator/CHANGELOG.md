# Mailto Link Generator Changelog

## [Initial Version] - 2026-07-21

- Generate `mailto:` links from a form with To, Cc, Bcc, Subject and Body
- Copy the link as a raw `mailto:` URI or as an HTML `<a href>` anchor
- Open a pre-filled draft in the default mail app, Gmail, or Outlook
- Live preview with RFC 6068-correct encoding (CRLF body line breaks, `%20` spaces, `+` → `%2B`)
- Lenient, on-blur email validation for multiple comma/semicolon/newline-separated recipients
- Optional, opt-in pre-fill via preferences (default Cc/Bcc, signature, remember last-used values)
