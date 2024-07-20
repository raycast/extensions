# cemil

Lists and opens frequenlty used links defined by a config file

Example config.json

```json
{
  "projects": [
    {
      "name": "foo-app",
      "grafanaDashboardIds": [1],
      "databaseIds": [1],
      "customLinks": [
        {
          "name": "github url",
          "url": "https://foo.github.com"
        }
      ]
    }
  ],
  "customLinks": [
    {
      "name": "Team Git Group",
      "url": "https://git.team.com"
    }
  ],
  "databases": [
    {
      "id": 1,
      "name": "db 1",
      "dc": "datacenter-1",
      "fullClusterName": "db1datacenter1-v3",
      "clusterName": "db1-v3",
      "url": "http://url"
    }
  ],
  "grafanaDashboards": [
    {
      "id": 1,
      "name": "Dashboard",
      "url": "https://foo.bar.com/dashboard2"
    }
  ],
  "templates": [
    {
      "name": "Git Url",
      "templateUrl": "https://foo.github.com/###_APP_NAME_###",
      "type": "project"
    },
    {
      "name": "Db Dashboard",
      "templateUrl": "https://dasboard.foo.com/region=###_DC_###&cluster=###_DB_CLUSTER_NAME_###",
      "type": "databaseDashboard"
    }
  ]
}
```

## Available Template Placeholder Variables

```
APP_NAME_PLACEHOLDER = "###_APP_NAME_###";
DC_PLACEHOLDER = "###_DC_###";
DB_CLUSTER_NAME_PLACEHOLDER = "###_DB_CLUSTER_NAME_###";
```

## Available Template Types

__project__: generated url from template is listed under each project

__databaseDashboard__: generated url from template is listed under each database