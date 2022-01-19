<h1 align="center">
  Sourcgraph Raycast Extension
</h1>

<p align="center">
  Search your code and 2M+ public repositories on <a href="https://about.sourcegraph.com/code-search">Sourcegraph</a> directly within <a href="https://www.raycast.com">Raycast</a>.
</p>

<p align="center">
  <a href="#setup"><strong>Setup</strong></a> · 
  <a href="https://github.com/bobheadxi/raycast-sourcegraph/issues"><strong>Issues</strong></a> · 
  <a href="#contributing"><strong>Contributing</strong></a>
</p>

<p align="center">
  <img src="https://github.com/bobheadxi/raycast-sourcegraph/blob/main/assets/demo.png?raw=true" alt="demo" />
</p>

<br>

## Setup

### Sourcegraph Cloud

No setup is required to start searching public code on [Sourcegraph Cloud](https://sourcegraph.com/search).
To search your private code and configure your own [search contexts](#search-contexts), [sign up for a Sourcegraph Cloud account](https://sourcegraph.com/sign-up)!

Once you have an account, you can create an access token under the "Access tokens" tab in your user settings.
Copy that access token to the Sourcegraph Cloud access token field in the Raycast extension preferences to authenticate your search queries.

### Sourcegraph instance

To start searching code on a [self-hosted Sourcegraph instance](https://docs.sourcegraph.com/admin/install), you can configure access to any Sourcegraph instance by running the "Search Code - Sourcegraph Instance" command in Raycast.

When asked for an access token, you can create an access token under the "Access tokens" tab in your user settings on your Sourcegraph instance.
Copy that access token to the appropriate access token field in the Raycast extension preferences to authenticate your search queries.

### Search contexts

[Search contexts](https://docs.sourcegraph.com/code_search/explanations/features#search-contexts) allow you to narrow down your search to code you care about.
To get started, you can try the [public Sourcegraph Cloud contexts](https://sourcegraph.com/contexts), or configure your own in your Sourcegraph Cloud account or Sourcegraph instance's "Contexts" page!

The Sourcegraph Raycast extension allows you to set a default context for all your searches in the extension preferences.
To override it for a search, just include a `context:` parameter in your query.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) if you're interested in contributing to this extension!
