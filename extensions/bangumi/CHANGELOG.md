# Changelog

## [1.2.0](https://github.com/maxchang3/raycast-bangumi/compare/v1.1.0...v1.2.0) - {PR_MERGE_DATE}

### ✨ New

- centralize image URL sanitization logic in shared utils and apply it to detail views ([9d96332](https://github.com/maxchang3/raycast-bangumi/commit/9d96332bdfd1aa3cab66e46e22939daa76487a30))

## [1.1.0](https://github.com/maxchang3/raycast-bangumi/compare/v1.0.0...v1.1.0) - 2026-06-10

### ✨ New

- add character search functionality, character detail views, and related works list component. ([775c891](https://github.com/maxchang3/raycast-bangumi/commit/775c8919f8040aa5425891143aa8c7eb12d6a4ee))
- **AI-Tools:** format generated output as Markdown content ([437308b](https://github.com/maxchang3/raycast-bangumi/commit/437308b7e5c14f2afa6cbb046bd5fdf22fd6419f))
- **CharacterDetail:** add AI-powered summary translation feature ([db2dad8](https://github.com/maxchang3/raycast-bangumi/commit/db2dad82537d3c910bfd82c578f2aedf2ba73b1b))
- **Collection:** reorder Show Details action to the top ([bc40c9f](https://github.com/maxchang3/raycast-bangumi/commit/bc40c9f665d4999c5b327cb6660e209dbeefa686))
- **Detail:** show related subjects and unify relations list UI ([fe26963](https://github.com/maxchang3/raycast-bangumi/commit/fe26963dd3b2f3e5f8de963daf629aca722bc588))
- **RelationsList:** show subject type tag in accessories ([9fa77d5](https://github.com/maxchang3/raycast-bangumi/commit/9fa77d591dbd871733863939c45ca181a2e18065))
- **SubjectCharactersList:** add character summary as subtitle ([41652ca](https://github.com/maxchang3/raycast-bangumi/commit/41652ca95507af53ce5852b3db08a4b468f8a7df))
- **SubjectDetail:** improve display with dynamic markdown headers ([191d9d4](https://github.com/maxchang3/raycast-bangumi/commit/191d9d485fc21dd3a442448997ccfe6e6d709610))

### 🐞 Fixes

- improve summary text formatting ([0427e92](https://github.com/maxchang3/raycast-bangumi/commit/0427e921103374e67e141ebf29d8475ab7fa1999))
- update search limit constraints to 20 for subjects and characters ([db1d8bb](https://github.com/maxchang3/raycast-bangumi/commit/db1d8bb5c81f61ee1c811b9b6f458788af49459f))

### 💎 Improvements

- remove unnecessary optional chaining for required properties ([ce8372e](https://github.com/maxchang3/raycast-bangumi/commit/ce8372e6f4a51aa1652a07d591c588b23f8b861a))
- remove unneeded optional chaining ([64778b6](https://github.com/maxchang3/raycast-bangumi/commit/64778b63b0ca72bb233750473693a61f129cc67f))
- transition all Bangumi API methods to use object-based parameters ([2d59265](https://github.com/maxchang3/raycast-bangumi/commit/2d592658e53c8c9ee64d4e441a95037720b67c73))
- unify summary formatting ([2ff4af9](https://github.com/maxchang3/raycast-bangumi/commit/2ff4af91f2118cc2f4f73e4155e4a94b75a21588))

## 1.0.0 - 2026-06-08

### ✨ New

- add ai tools ([364213f](https://github.com/maxchang3/raycast-bangumi/commit/364213f301d381a4360e7e62805a642df993ea51))
- add batch update episodes support and implement mark up to here as watched action ([3e99db3](https://github.com/maxchang3/raycast-bangumi/commit/3e99db344253ed764ce352e75d9edab652b353e6))
- add character and voice actor information to subject detail view ([753d539](https://github.com/maxchang3/raycast-bangumi/commit/753d5396a789c41dcc0068c6d5c1af818f8028cd))
- add cmd+o keyboard shortcut to all browser navigation actions ([78c076b](https://github.com/maxchang3/raycast-bangumi/commit/78c076b7fb134c267b4d25fc82b3c1e5eb879d4b))
- add daily anime airing calendar view ([05bee6a](https://github.com/maxchang3/raycast-bangumi/commit/05bee6af6a4564513a0037c30fe196679bd744f9))
- add episode collection update capability and enhance progress view styling ([3773588](https://github.com/maxchang3/raycast-bangumi/commit/377358830270c69f1b9776c8332f9f7a1df7b984))
- add search command to browse and view Bangumi subjects ([29a120d](https://github.com/maxchang3/raycast-bangumi/commit/29a120debf4ad5cea737036fd00d9bb967b336d7))
- add SubjectDetail component and integrate into collection list and calendar views ([69d00fe](https://github.com/maxchang3/raycast-bangumi/commit/69d00fe0165561c9b4ba29432e8e401ce0a286cd))
- add support for updating subject collection status with optimistic UI updates ([048352a](https://github.com/maxchang3/raycast-bangumi/commit/048352ab65027751319a32c0230787c24f1d8586))
- group episodes by type in the grid view ([28a8b49](https://github.com/maxchang3/raycast-bangumi/commit/28a8b494ee6395d41d4843d58b0ac90c242a2253))
- improve confirmation message with subject name parameter ([1b18114](https://github.com/maxchang3/raycast-bangumi/commit/1b181141163bb24714f32874e224643462bc007b))
- **MyCollection:** add subject type filtering ([46bdc3e](https://github.com/maxchang3/raycast-bangumi/commit/46bdc3eb1cc802a7b1e97b36278084207100617b))
- refactor collection status display and fix fetching logic ([d9b5927](https://github.com/maxchang3/raycast-bangumi/commit/d9b5927c1e9bc13b0d0dab69e270b19c171c0560))
- support OAuth authentication ([be0879f](https://github.com/maxchang3/raycast-bangumi/commit/be0879f8ff8970d444646fe075bd2c3425fe5f33))

### 🐞 Fixes

- **api:** defer access token retrieval to request time via middleware ([a295ce9](https://github.com/maxchang3/raycast-bangumi/commit/a295ce9cbbb78875400f613a757db1e9bca3a701))
- handle non-404 errors in getSubjectCollection and update app icon ([a185167](https://github.com/maxchang3/raycast-bangumi/commit/a185167641cc57e842b91296fece8f2b452f1090))
- **update-collection:** pass subjectType to getCollectionTag for correct verb ([a96c2f3](https://github.com/maxchang3/raycast-bangumi/commit/a96c2f351ed08ba529613ca208a6bf3c00bb1e2c))

### 💎 Improvements

- adjust component structure ([29a3530](https://github.com/maxchang3/raycast-bangumi/commit/29a3530d0a8287c9c2978f3b44640cd02a2afe5c))
- internationalize UI strings and preferences to English ([61dc191](https://github.com/maxchang3/raycast-bangumi/commit/61dc191703eebd3c956a5d5ecd3409d80d8763ff))
- keep use English ([a361158](https://github.com/maxchang3/raycast-bangumi/commit/a361158f7c0fbe77a4508cb00035000aeef22147))
- optimize project structure and rename components ([3d93bdf](https://github.com/maxchang3/raycast-bangumi/commit/3d93bdf08070a00cdf6239d11266595c45c89024))
- **ProgressViewer:** simplify today's date string formatting using toLocaleDateString ([8dba651](https://github.com/maxchang3/raycast-bangumi/commit/8dba6510dca076d3799eebb76db802a0775cc1bd))
- remove redundant type assertions and cleanup subject collection status handling ([788001f](https://github.com/maxchang3/raycast-bangumi/commit/788001f233f9856a0696a40f5273c7cb02a41869))
- rename CollectionList component to MyCollection ([6463847](https://github.com/maxchang3/raycast-bangumi/commit/6463847fb7d052e90fbebb60b9444223f5e52b30))
- rename command identifiers ([1693e7a](https://github.com/maxchang3/raycast-bangumi/commit/1693e7ab54388abe9f47792c56f5387a127659f6))
- replace manual toast error handling with showFailureToast ([7eab4f8](https://github.com/maxchang3/raycast-bangumi/commit/7eab4f840bad63227578971868dc1e8672f5e1d5))
- simplify episode data handling and refine status action visibility logic ([22a54a2](https://github.com/maxchang3/raycast-bangumi/commit/22a54a23b31c8074c4a53cb7be06b5ae236e2859))
