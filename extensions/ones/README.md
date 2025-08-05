# raycast-extension-ones

<p align="center">
<a href="https://github.com/k8scat/raycast-extension-ones"><img src="https://img.shields.io/github/stars/k8scat/raycast-extension-ones.svg?style=flat&logo=github&colorB=deeppink&label=stars"></a>
<a href="https://github.com/k8scat/raycast-extension-ones"><img src="https://img.shields.io/github/forks/k8scat/raycast-extension-ones.svg"></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="License: MIT"></a>
</p>

[Raycast](https://www.raycast.com/) extension for [ONES](https://ones.ai).

## Install

### From [Source Code](https://github.com/k8scat/raycast-extension-ones)

```bash
git clone https://github.com/k8scat/raycast-extension-ones.git
cd raycast-extension-ones
npm install
npm run dev # This will install the extension, and then you can stop it.
```

### From [Raycast Store](https://www.raycast.com/store)

Web Store: [https://www.raycast.com/k8scat/ones](https://www.raycast.com/k8scat/ones).

Or search `ONES` in the APP Store.

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

| Name          | Required | Description                                            | DefaultValue                       |
| ------------- | -------- | ------------------------------------------------------ | ---------------------------------- |
| URL           | true     | URL for ONES                                           | [https://ones.ai](https://ones.ai) |
| Email         | true     | Email for ONES                                         |                                    |
| Password      | true     | Password for ONES                                      |                                    |
| Team UUID     | false    | Team UUID for ONES                                     |                                    |
| Manhour Owner | false    | Manhour owner name or uuid                             | Login User UUID                    |
| Manhour Days  | false    | Query Manhours in n days                               | 7                                  |
| Manhour Task  | false    | UUID of the task where manhour record                  |                                    |
| Manhour Mode  | false    | Manhour mode for ONES, support `Simple` and `Detailed` | Simple                             |

## Original Repository

[k8scat/raycast-extension-ones](https://github.com/k8scat/raycast-extension-ones.git)

## Authors

[K8sCat](https://github.com/k8scat)

## LICENSE

[MIT](./LICENSE)
