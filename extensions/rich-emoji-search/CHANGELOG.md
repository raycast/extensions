# Rich Emoji Search Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Fuzzy-search all 3,608 emojis that [textualize/rich](https://github.com/Textualize/rich) exposes, in a resizable grid
- Paste or copy the emoji, its `:name:` console markup, or the bare name
- Search synonyms generated from Unicode CLDR annotations, so `happy` finds `grinning_face` and `celebrate` finds `tada`
- Country codes decoded from each flag's own codepoints, so `us` reaches `flag_for_united_states`
- Every rich name kept as its own result rather than deduplicated by character, since in rich the name is what you insert
- Text-presentation characters such as `information` and `airplane` paste with U+FE0F so they render as emoji, offer **Paste Exact Character** for rich's exact bytes, and preview in the grid the way a terminal draws them
