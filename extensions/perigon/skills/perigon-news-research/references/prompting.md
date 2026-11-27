# Prompting patterns (news research)

Examples that map well to Perigon tools:

- Top political headlines in the United States from today → dated `search_news_articles` with category/geo filters.
- Latest tech news from California this week → location + date window on articles or stories.
- Journalists covering renewable energy, then their recent articles → `search_journalists` then article search on resolved ids.
- Search Tesla, then recent stories → `search_companies` then `get_company_news` or story search.
- How sentiment on [topic] trended this month → matched filters on `get_article_counts` + `get_avg_sentiment`.

MCP prompts (when the host supports them) align with these workflows: `entity_deep_dive`, `narrative_trace`, `coverage_trend`, `journalist_beat_profile`, `competitive_landscape`, `spike_explainer`.

## Social research examples

- Recent English X posts about renewable energy → `search_x_posts`, `searchType=LATEST`, with language and date operators in `query`.
- Top AI posts in r/technology this week → `search_reddit_posts`, `subreddit=technology`, `sort=TOP`, `time=WEEK`.
- LinkedIn posts about AI funding this week → `search_linkedin_posts`, `query=AI AND funding`, `datePosted=PAST_WEEK`, `sortBy=DATE_POSTED`.
- Recent posts by a company or person on LinkedIn → use a supplied or verified LinkedIn URL with `get_linkedin_company_posts` or `get_linkedin_person_activity`.
- Compare news and social discussion → search each source independently, cite returned evidence, and distinguish sample themes from measured news statistics. Do not claim comprehensive social coverage or a social sentiment score that the tools did not return.

Social access depends on the organization's source entitlements. Social searches consume a separate social quota if the plan has one, otherwise the news request quota; these tools cannot post or message on the user's behalf.

## Updated research examples

- Worldwide semiconductor articles → `search_news_articles` with `query`, `countries=[]`, explicit dates and language.
- Most-covered AI stories, then their leading publishers → `search_news_stories` with `minSourceDiversity=0.2`, followed by `get_top_entities` with a returned `clusterId` and `entity=[sources,journalists]`.
- Journalist profile details and available email → `search_journalists`; report only returned email addresses, subject to access.
- Whole-range news volume → `get_article_counts` with `splitBy=NONE`; report the returned total without inventing dated buckets.
