# Text to Resume Tool

Raycast AI extracts the user's text into a JSON Resume object or section fragment, then calls `text-to-resume` to validate it against `@jsonresume/schema` and return formatted JSON. The tool makes no additional AI requests and leaves the clipboard unchanged.

## Inputs

- `resumeJson`: A serialized JSON Resume object. Use schema fields such as `basics.url`, `work.name`, `work.url`, and `education.score`. Include only facts supplied by the user. Dates may be `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; omit unknown dates rather than estimating them.
- `outputPath` (optional): Only supply this when the user explicitly requests a file. A confirmation displays the resolved path. The tool creates a new file and refuses to overwrite an existing file.

For example, after extracting education text, call the tool with:

```json
{
  "resumeJson": "{\"education\":[{\"institution\":\"Example University\",\"studyType\":\"Bachelor\",\"area\":\"Computer Science\",\"endDate\":\"2017-06\",\"score\":\"3.7/4.0\"}]}"
}
```

The returned value is the validated object formatted as JSON. Invalid JSON, non-object roots, and invalid schema fields produce errors for the calling model to correct and retry. Validation happens before any file write. No resume is added to the saved URL collection; that collection is managed by the resume commands.

Run `npm test` for synthetic renderer, validation, and tool regression tests. AI evals in `package.json` exercise extraction and tool routing separately in Raycast.
