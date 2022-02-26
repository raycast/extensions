# raycast-ones-extensions

<p align="center">
<a href="https://github.com/k8scat/raycast-ones-extensions"><img src="https://img.shields.io/github/stars/k8scat/raycast-ones-extensions.svg?style=flat&logo=github&colorB=deeppink&label=stars"></a>
<a href="https://github.com/k8scat/raycast-ones-extensions"><img src="https://img.shields.io/github/forks/k8scat/raycast-ones-extensions.svg"></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="License: MIT"></a>
</p>

[Raycast](https://www.raycast.com/) extensions for [ones.ai](https://ones.ai).

## Support

- Search Content
  - Project
    - [x] project
    - [x] task
      - [x] record manhour
      - [x] delete task
    - [x] sprint
    - [x] resource
  - Wiki
    - [x] space
    - [x] page
    - [x] resource
- Manage Manhour
  - [x] query
  - [x] modify
  - [x] record
  - [x] delete

## Preferences

| Name          | Required | Description                                                        | DefaultValue    |
| ------------- | -------- | ------------------------------------------------------------------ | --------------- |
| URL           | true     | URL for ONES                                                       | https://ones.ai |
| Email         | true     | Email for ONES                                                     |                 |
| Password      | true     | Password for ONES                                                  |                 |
| Team UUID     | false    | Team UUID for ONES                                                 |                 |
| Manhour Owner | false    | Manhour owner name or uuid, set to ONES API - UserUUID while empty |                 |
| Manhour Days  | false    | Query Manhours in n days                                           | 7               |
| Manhour Task  | false    | UUID of the task where manhour record                              |                 |
| Manhour Mode  | false    | Manhour mode for ONES                                              | Simple          |

## LICENSE

[MIT](./LICENSE)
