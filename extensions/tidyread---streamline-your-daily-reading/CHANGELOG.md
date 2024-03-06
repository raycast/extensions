# TidyRead - Streamline Your Daily Reading Changelog

## TODO
- feat: Manage Sources Command add Show RSS Detail Action
- chore: change CATEGORIES const

## [Support Categorized Digest And Fix Some Edge Case Bugs] - 2024-01-30
- feat: digest can be categorized by tags
- feat: export digest as markdown file
- feat: add defaultSearchText context for search rss page
- chore: moonshot default to 8k
- chore: improve feedback and digest content
- chore: change prompt to remove ads
- chore: improve speed of parse RSS
- fix: abort on RSS pull failed
- fix: RSS pull 406 error code
- fix: feed with only summary cause empty content

## [Add Search RSS Page] - 2024-01-30
- add search rss page
- add generate digest in background
- add redirect route to improve onboarding experience
- add some feedback iamges in degest
- improve gen digest panel
- change metadata images
- fix default maxItemsPerFeed 10 => 5


## [Improving Digest Speed] - 2024-01-26

- add progress display for generating digest
- openai api change to normal response instead of stream
- improve translate prompt
- change api config based on provider instead of same
- translate and summarize in parallel
- requestTimeout default to 30s

## [Onboarding Page] - 2024-01-24

- add quickly generating sources by user interest
- add retryCount and retryDelay setting to decrease article summarizing error
- improve speed of batch import sources
- improve error handling and error message
- add Delete All Sources
- add doc for two commands
- fix fetch large html content memory leak

## [Initial Version] - 2024-01-06

init
