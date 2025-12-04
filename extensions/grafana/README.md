<div align="center">
  <img
    src="./assets/grafana-logo.png"
    width="50"
  />

  <h1>
    Grafana
  </h1>

Raycast extension to search dashboards, go to the explore view, create saved queries and list them, create, search and modify annotations, and more to come.

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
- Go to the Explore grafana page
- List, create & open saved queries

## Getting started

- Go to to your Grafana instance (cloud or self-hosted) and add a new Service Account (e.g. `https://<organization>.grafana.net/org/serviceaccounts/create`)
- Give your Service Account a name e.g. `Raycast` & select the editor role (recommended)
- Click on `Add service account token` & store in a secure location the given access token
- Start a grafana command and fill the required fields
  - Root API Url: is the URL of your grafana instance. If you use Grafana Cloud: `https://<organization>.grafana.net`
  - Service Account token: your access token previously generated

Now you should be able to manage your Grafana Dashboards with Raycast 🚀.

> [!TIP]
> Set `CTRL + CMD + G` as a shortcut to open your dashboards from anywhere!

## Showcases

### List Dahsboards

![search-dashboards](./assets/showcase_search_dashboards.png)

### List Annotations

![search-annotations](./assets/showcase_search_annotations.png)

### Create Annotation

![create-annotation](./assets/showcase_create_annotation.png)

### Create saved query

Create a query you often need on Grafana explore via this Raycast extension, to send use it with the "List saved queries" command

![create-saved-query](./assets/showcase_create_saved_query.png)

### List saved queries

Open saved queries directly in your grafana Explore page

![list-saved-queries](./assets/showcase_list_saved_queries.png)

---

> [!NOTE]  
> Extension built & tested for Grafana Cloud v11
