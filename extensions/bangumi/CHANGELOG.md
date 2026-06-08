# Changelog

## 1.0.0 - {PR_MERGE_DATE}


### ✨ New

* add ai tools ([364213f](https://github.com/maxchang3/raycast-bangumi/commit/364213f301d381a4360e7e62805a642df993ea51))
* add batch update episodes support and implement mark up to here as watched action ([3e99db3](https://github.com/maxchang3/raycast-bangumi/commit/3e99db344253ed764ce352e75d9edab652b353e6))
* add character and voice actor information to subject detail view ([753d539](https://github.com/maxchang3/raycast-bangumi/commit/753d5396a789c41dcc0068c6d5c1af818f8028cd))
* add cmd+o keyboard shortcut to all browser navigation actions ([78c076b](https://github.com/maxchang3/raycast-bangumi/commit/78c076b7fb134c267b4d25fc82b3c1e5eb879d4b))
* add daily anime airing calendar view ([05bee6a](https://github.com/maxchang3/raycast-bangumi/commit/05bee6af6a4564513a0037c30fe196679bd744f9))
* add episode collection update capability and enhance progress view styling ([3773588](https://github.com/maxchang3/raycast-bangumi/commit/377358830270c69f1b9776c8332f9f7a1df7b984))
* add search command to browse and view Bangumi subjects ([29a120d](https://github.com/maxchang3/raycast-bangumi/commit/29a120debf4ad5cea737036fd00d9bb967b336d7))
* add SubjectDetail component and integrate into collection list and calendar views ([69d00fe](https://github.com/maxchang3/raycast-bangumi/commit/69d00fe0165561c9b4ba29432e8e401ce0a286cd))
* add support for updating subject collection status with optimistic UI updates ([048352a](https://github.com/maxchang3/raycast-bangumi/commit/048352ab65027751319a32c0230787c24f1d8586))
* group episodes by type in the grid view ([28a8b49](https://github.com/maxchang3/raycast-bangumi/commit/28a8b494ee6395d41d4843d58b0ac90c242a2253))
* improve confirmation message with subject name parameter ([1b18114](https://github.com/maxchang3/raycast-bangumi/commit/1b181141163bb24714f32874e224643462bc007b))
* **MyCollection:** add subject type filtering ([46bdc3e](https://github.com/maxchang3/raycast-bangumi/commit/46bdc3eb1cc802a7b1e97b36278084207100617b))
* refactor collection status display and fix fetching logic ([d9b5927](https://github.com/maxchang3/raycast-bangumi/commit/d9b5927c1e9bc13b0d0dab69e270b19c171c0560))
* support OAuth authentication ([be0879f](https://github.com/maxchang3/raycast-bangumi/commit/be0879f8ff8970d444646fe075bd2c3425fe5f33))


### 🐞 Fixes

* **api:** defer access token retrieval to request time via middleware ([a295ce9](https://github.com/maxchang3/raycast-bangumi/commit/a295ce9cbbb78875400f613a757db1e9bca3a701))
* handle non-404 errors in getSubjectCollection and update app icon ([a185167](https://github.com/maxchang3/raycast-bangumi/commit/a185167641cc57e842b91296fece8f2b452f1090))
* **MyCollection:** prevent infinite-load loop when subject types are filtered ([bb522b6](https://github.com/maxchang3/raycast-bangumi/commit/bb522b6ce2fe8c82fdc8eb8f41e53dda228e3d7d))
* **update-collection:** pass subjectType to getCollectionTag for correct verb ([2470aa7](https://github.com/maxchang3/raycast-bangumi/commit/2470aa7f28d0ff9de7e88a5c209aa463097a9b78))


### 💎 Improvements

* adjust component structure ([29a3530](https://github.com/maxchang3/raycast-bangumi/commit/29a3530d0a8287c9c2978f3b44640cd02a2afe5c))
* internationalize UI strings and preferences to English ([61dc191](https://github.com/maxchang3/raycast-bangumi/commit/61dc191703eebd3c956a5d5ecd3409d80d8763ff))
* keep use English ([7fa9bd5](https://github.com/maxchang3/raycast-bangumi/commit/7fa9bd577b1634bd9da4dcc40c4d3538a60b87e0))
* optimize project structure and rename components ([3d93bdf](https://github.com/maxchang3/raycast-bangumi/commit/3d93bdf08070a00cdf6239d11266595c45c89024))
* **ProgressViewer:** simplify today's date string formatting using toLocaleDateString ([8dba651](https://github.com/maxchang3/raycast-bangumi/commit/8dba6510dca076d3799eebb76db802a0775cc1bd))
* remove redundant type assertions and cleanup subject collection status handling ([788001f](https://github.com/maxchang3/raycast-bangumi/commit/788001f233f9856a0696a40f5273c7cb02a41869))
* rename CollectionList component to MyCollection ([6463847](https://github.com/maxchang3/raycast-bangumi/commit/6463847fb7d052e90fbebb60b9444223f5e52b30))
* rename command identifiers ([1693e7a](https://github.com/maxchang3/raycast-bangumi/commit/1693e7ab54388abe9f47792c56f5387a127659f6))
* replace manual toast error handling with showFailureToast ([7eab4f8](https://github.com/maxchang3/raycast-bangumi/commit/7eab4f840bad63227578971868dc1e8672f5e1d5))
* simplify episode data handling and refine status action visibility logic ([22a54a2](https://github.com/maxchang3/raycast-bangumi/commit/22a54a23b31c8074c4a53cb7be06b5ae236e2859))
