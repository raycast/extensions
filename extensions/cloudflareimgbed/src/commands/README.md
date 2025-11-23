# Commands Plan

1. `list.tsx` (default command)
   - Powered by `useImgBedList`, supports search plus directory/tag/channel filters.
   - Actions: copy URL/Markdown/HTML, push detail view, delete with confirm, refresh.
2. `upload.tsx`
   - Select local images, configure upload params, handled via `useUpload`.
3. `upload-from-clipboard.ts`
   - Detect clipboard images or URLs, allow parameter overrides before uploading.

> `src/imgbed.ts` will eventually move into the `commands/list.tsx` structure; for now it remains a placeholder.
