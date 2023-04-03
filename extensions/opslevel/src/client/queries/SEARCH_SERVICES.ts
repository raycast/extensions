import { graphql } from "../gql";
export const SEARCH_SERVICES = graphql(/* GraphQL */ `
  query search($after: String, $first: Int, $sortBy: ServiceSortEnum, $searchText: String) {
    account {
      servicesV2(after: $after, first: $first, sortBy: $sortBy, searchTerm: $searchText) {
        filteredCount
        edges {
          node {
            ...ServiceParts
          }
        }
      }
    }
  }

  fragment ServiceParts on Service {
    id
    alias
    name
    linkable
    href
    locked
    description
    htmlUrl
    owner {
      name
      href
    }
    tier {
      name
      index
    }
    product
    language
    framework
    aliases
    note
    tags {
      nodes {
        plainId
        id
        key
        value
      }
    }
    service_stat: checkStats {
      num_checks: totalChecks
      num_passing_checks: totalPassingChecks
    }
    lastDeploy {
      deployedAt
      commitSha
      author
    }
    hasServiceConfigError
    service_level: serviceStats {
      ...ServiceLevel
    }
    level_index: levelIndex
    tools(bestProdEnv: true) {
      nodes {
        displayCategory
        displayName
        environment
        url
      }
    }
    alertStatus {
      index
      type
    }
    creationSource
    onCalls(first: 10, sortBy: name_ASC) {
        nodes {
          name
          externalEmail
        }
      }
  }

  fragment ServiceLevel on ServiceStats {
    rubric {
      level {
        index
        name
      }
    }
  }
`);