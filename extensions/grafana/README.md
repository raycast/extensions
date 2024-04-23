<div align="center">
  <img
    src="./assets/grafana-logo.png"
    width="50"
  />

  <h1>
    Grafana
  </h1>

Raycast extension to search dashboards, go to the explore view, create, search and modify annotations, and more to come.

  <p>
    <a href="https://www.raycast.com/francois/grafana">
      <img src="https://img.shields.io/badge/Raycast-store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <a
      href="https://github.com/raycast/extensions/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="raycast-extensions is released under the MIT license."
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"  
    />
  </p>
</div>

## Features

- Quick access & search to your dashboards
- Search, create, update & delete an annotation

## Getting started

- Go to to your Grafana instance (cloud or self-hosted) e.g. `https://<organization>.grafana.net/org/apikeys`
- Click on `Add API key`
- Give your key a name e.g. `Raycast`, select the viewer role (recommended), and set an expiration date (recommended
- Store in a secure location the given access token
- Start a grafana command and fill the required fields
  - Root API Url: is the URL of your grafana instance. If you use Grafana Cloud, it is like `https://<organization>.grafana.net`
  - API-key with your access token previsouly generated.

Now you should be able to manage your Grafana Dashboards with Raycast 🚀.

## Showcases

### List Dahsboards

![search-dashboards](./assets/showcase_search_dashboards.png)

### List Annotations

![search-annotations](./assets/showcase_search_annotations.png)

### Create Annotation

![search-dashboards](./assets/showcase_create_annotation.png)

---

_Extension built & tested for Grafana Cloud v8_
