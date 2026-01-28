## Features

- [ ] Support for adding new tags through Raycast.

Raycast doesn't support adding _new_ items to a [`TagPicker`][tagpicker] today. We might
be able to hack something together using a toggleable field that would let you add new tags
with a comma-separated value system or something, though.

---

- [ ] Support for adding `#tags` from the body text.

Today, we only grab the `tags` field in the frontmatter and treat those as the tags.
But obsidian also supports using `#tags` inside the text body. We could add better support
for handling those use cases.

---

- [ ] Edit your existing bookmarks.

Today we don't support editing your bookmarks. But we _could_ do this by just opening
prefilling a form from the frontmatter and notes fields. It wouldn't be perfect, and
needs to be tweaked a bit.

[tagpicker]: https://developers.raycast.com/api-reference/user-interface/form#form.tagpicker

---

- [x] Better lazy handling of files.

We shouldn't have to read files from the disk every time we load the search. We could store
the `mtime` in the cache and only read from the disk up front if the `mtime` has been changed.

Then we could lazily read from the files if the user has started typing into the search field
so that we can do some kind of full text search. (This will likely require playing around with
fuse a bit to see if we can update existing entries.)

---

- [x] Better handling for duplicate links

It'd be nice if we could let you know if you're saving a link that's already in your
bookmarks. Maybe with a Toast notification, and then it could prefill based on the
data we pull from Obsidian.

(Pre-requisite to this is probably "Editing existing bookmarks".)
