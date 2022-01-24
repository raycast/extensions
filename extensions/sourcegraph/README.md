<br />

<p align="center">
  <img src="https://github.com/bobheadxi/raycast-sourcegraph/blob/main/assets/command-icon.png?raw=true" alt="sourcegraph" width="52px" />
</p>

<h1 align="center">
  Sourcgraph Raycast Extension
</h1>

<p align="center">
  Search your code and 2M+ public repositories on <a href="https://about.sourcegraph.com">Sourcegraph</a> directly within <a href="https://www.raycast.com">Raycast</a>.
</p>

<p align="center">
  <a href="#install"><strong>Install</strong></a> · 
  <a href="#setup"><strong>Setup</strong></a> · 
  <a href="#commands"><strong>Commands</strong></a> · 
  <a href="https://github.com/bobheadxi/raycast-sourcegraph/issues"><strong>Issues</strong></a> · 
  <a href="#changelog"><strong>Changelog</strong></a> · 
  <a href="#contributing"><strong>Contributing</strong></a>
</p>

<p align="center">
  <img src="https://github.com/bobheadxi/raycast-sourcegraph/blob/main/assets/demo.png?raw=true" alt="demo" />
</p>

<br />

## Install

To get started, install [Raycast](https://www.raycast.com/) and [install the Sourcegraph extension from the Raycast extensions store](https://www.raycast.com/bobheadxi/sourcegraph).

Alternatively, you can [install this extension from source](./CONTRIBUTING.md).

<br />

## Setup

This extension adds a [variety of commands](#commands) for interacting with [Sourcegraph](https://about.sourcegraph.com).
Some configuration is required to use certain features, most notably the [variants of each command for Sourcegraph Self-Hosted](#sourcegraph-self-hosted), though you can get started with [Sourcegraph Cloud commands](#sourcegraph-cloud) without any additional setup.

### Sourcegraph Cloud

No setup is required to connect to [Sourcegraph Cloud](https://sourcegraph.com/search)!
To search your private code, configure your own [search contexts](#search-contexts), create your own search notebooks, and more, [sign up for a Sourcegraph Cloud account](https://sourcegraph.com/sign-up)!

Once you have an account, you can create an access token under the "Access tokens" tab in your user settings on [Sourcegraph Cloud](https://sourcegraph.com).
Copy that access token to the "Sourcegraph Cloud: Access token" field in the Sourcegraph Raycast extension preferences to authenticate your search queries.

### Sourcegraph Self-Hosted

To start searching code on a [self-hosted Sourcegraph instance](https://docs.sourcegraph.com/admin/install), you can set up access to any Sourcegraph instance by configuring the "Sourcegraph Self-Hosted: Instance URL" and "Sourcegraph Self-Hosted: Access token" fields in the Sourcegraph Raycast extension preferences.
You can create an access token under the "Access tokens" tab in your user settings on your Sourcegraph instance.

<br />

## Commands

### Search Code

Get results as you type on [code search](https://about.sourcegraph.com/code-search) over your code and 2M+ public repositories.

#### Search contexts

[Search contexts](https://docs.sourcegraph.com/code_search/explanations/features#search-contexts) allow you to narrow down your search to code you care about.
To get started, you can try the [public Sourcegraph Cloud contexts](https://sourcegraph.com/contexts), or configure your own in your Sourcegraph Cloud account or Sourcegraph instance's "Contexts" page!

The Sourcegraph Raycast extension allows you to set a default context for your searches in the "Search Code" command preferences.
To override it for a search, just include a `context:` parameter in your query.

### Find Search Notebooks

Browse and preview [search notebooks](https://sourcegraph.com/notebooks).

<br />

## Changelog

The [changelog](CHANGELOG.md) documents all notable updates to the extension.

Updates will be regularly published to the [Raycast Extensions repository](https://github.com/raycast/extensions) from the [`bobheadxi/raycast-sourcegraph` repository](https://github.com/bobheadxi/raycast-sourcegraph).
To try out yet-to-be-published changes, you can [install this extension from source](./CHANGELOG.md).

<br />

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) if you're interested in contributing to this extension!

Have ideas or suggestions? Please feel free to [open an issue with feedback](https://github.com/bobheadxi/raycast-sourcegraph/issues)!

<br />
