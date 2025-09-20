import { gql } from "@apollo/client";

export const GetAllServices = gql(/* GraphQL */ `
    query GetAllServices($cursor: String) {
        account {
            servicesV2(after: $cursor) {
                pageInfo {
                    endCursor
                    hasNextPage
                }
                nodes {
                    ...Service
                }
            }
        }
    }

    fragment Service on Service {
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
            contacts {
                ...Contact
            }
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
                ...ServiceTool
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
                gravatarHref
            }
        }
        defaultServiceRepository {
            repository {
                displayName
                url
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

    fragment ServiceTool on Tool {
        id
        displayCategory
        displayName
        environment
        url
    }

    fragment Contact on Contact {
        displayName
        targetHref
        type
    }
`);
