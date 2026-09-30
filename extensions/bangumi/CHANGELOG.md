# Changelog

## [Initial Release] - 2026-07-02

### ✨ New

- support OAuth authentication ([be0879f](https://github.com/maxchang3/raycast-bangumi/commit/be0879f8ff8970d444646fe075bd2c3425fe5f33))

- add subject search, daily airing calendar, and full subject detail view with related subjects, characters, voice actors, and structured relations UI ([29a120d](https://github.com/maxchang3/raycast-bangumi/commit/29a120debf4ad5cea737036fd00d9bb967b336d7), [05bee6a](https://github.com/maxchang3/raycast-bangumi/commit/05bee6af6a4564513a0037c30fe196679bd744f9), [69d00fe](https://github.com/maxchang3/raycast-bangumi/commit/69d00fe0165561c9b4ba29432e8e401ce0a286cd), [191d9d4](https://github.com/maxchang3/raycast-bangumi/commit/191d9d485fc21dd3a442448997ccfe6e6d709610), [4209fe7](https://github.com/maxchang3/raycast-bangumi/commit/4209fe7))

- add collection system with status tracking, subject type filtering, episode detail viewing, and episode progress management including batch update and “mark up to here as watched” ([048352a](https://github.com/maxchang3/raycast-bangumi/commit/048352ab65027751319a32c0230787c24f1d8586), [46bdc3e](https://github.com/maxchang3/raycast-bangumi/commit/46bdc3eb1cc802a7b1e97b36278084207100617b), [3e99db3](https://github.com/maxchang3/raycast-bangumi/commit/3e99db344253ed764ce352e75d9edab652b353e6), [3773588](https://github.com/maxchang3/raycast-bangumi/commit/377358830270c69f1b9776c8332f9f7a1df7b984), [28a8b49](https://github.com/maxchang3/raycast-bangumi/commit/28a8b494ee6395d41d4843d58b0ac90c242a2253), [04a68ce](https://github.com/maxchang3/raycast-bangumi/commit/04a68ce))

- add character system with search, detail view, related works, and enriched subject integration ([775c891](https://github.com/maxchang3/raycast-bangumi/commit/775c8919f8040aa5425891143aa8c7eb12d6a4ee), [753d539](https://github.com/maxchang3/raycast-bangumi/commit/753d5396a789c41dcc0068c6d5c1af818f8028cd), [41652ca](https://github.com/maxchang3/raycast-bangumi/commit/41652ca95507af53ce5852b3db08a4b468f8a7df))

- integrate AI tools for content enhancement, including character summary translation and Markdown-formatted output ([364213f](https://github.com/maxchang3/raycast-bangumi/commit/364213f301d381a4360e7e62805a642df993ea51), [db2dad8](https://github.com/maxchang3/raycast-bangumi/commit/db2dad82537d3c910bfd82c578f2aedf2ba73b1b), [437308b](https://github.com/maxchang3/raycast-bangumi/commit/437308b7e5c14f2afa6cbb046bd5fdf22fd6419f))

---

### 💎 Improvements

- centralize image URL sanitization logic ([9d96332](https://github.com/maxchang3/raycast-bangumi/commit/9d96332bdfd1aa3cab66e46e22939daa76487a30))

- transition API to object-based parameters and unify summary formatting ([2d59265](https://github.com/maxchang3/raycast-bangumi/commit/2d592658e53c8c9ee64d4e441a95037720b67c73), [2ff4af9](https://github.com/maxchang3/raycast-bangumi/commit/2ff4af91f2118cc2f4f73e4155e4a94b75a21588))

- improve project structure, naming consistency, and remove unnecessary type noise ([3d93bdf](https://github.com/maxchang3/raycast-bangumi/commit/3d93bdf08070a00cdf6239d11266595c45c89024), [ce8372e](https://github.com/maxchang3/raycast-bangumi/commit/ce8372e6f4a51aa1652a07d591c588b23f8b861a), [64778b6](https://github.com/maxchang3/raycast-bangumi/commit/64778b63b0ca72bb233750473693a61f129cc67f), [0e8a3fc](https://github.com/maxchang3/raycast-bangumi/commit/0e8a3fc), [3afaac6](https://github.com/maxchang3/raycast-bangumi/commit/3afaac6), [16b7fcc](https://github.com/maxchang3/raycast-bangumi/commit/16b7fcc))

- enforce English-only UI and improve consistency across components and shortcuts ([61dc191](https://github.com/maxchang3/raycast-bangumi/commit/61dc191703eebd3c956a5d5ecd3409d80d8763ff), [9bc97a8](https://github.com/maxchang3/raycast-bangumi/commit/9bc97a8))

---

### 🐞 Fixes

- fix API authentication timing, collection error handling, and overall error handling stability ([a295ce9](https://github.com/maxchang3/raycast-bangumi/commit/a295ce9cbbb78875400f613a757db1e9bca3a701), [a185167](https://github.com/maxchang3/raycast-bangumi/commit/a185167641cc57e842b91296fece8f2b452f1090), [a96c2f3](https://github.com/maxchang3/raycast-bangumi/commit/a96c2f351ed08ba529613ca208a6bf3c00bb1e2c), [a4d014a](https://github.com/maxchang3/raycast-bangumi/commit/a4d014a))

- fix collection progress viewer stability, pagination, and progress calculation accuracy ([8e20e8a](https://github.com/maxchang3/raycast-bangumi/commit/8e20e8a), [303114d](https://github.com/maxchang3/raycast-bangumi/commit/303114d), [12df46b](https://github.com/maxchang3/raycast-bangumi/commit/12df46b))

- fix subject search limits, pagination edge cases, and summary formatting issues ([db1d8bb](https://github.com/maxchang3/raycast-bangumi/commit/db1d8bb5c81f61ee1c811b9b6f458788af49459f), [0427e92](https://github.com/maxchang3/raycast-bangumi/commit/0427e921103374e67e141ebf29d8475ab7fa1999), [1ddd202](https://github.com/maxchang3/raycast-bangumi/commit/1ddd202))

- fix daily calendar date indexing and scheduling consistency ([bf5c3d0](https://github.com/maxchang3/raycast-bangumi/commit/bf5c3d0))
