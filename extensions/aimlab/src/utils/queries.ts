import axios from "axios";

export const API_ENDPOINT = "https://api.aimlab.gg/graphql";
export const GET_USER_INFO = `
  query GetProfile($username: String) {
    aimlabProfile(username: $username) {
      username
      user {
        id
      }
      ranking {
        rank {
          displayName
          tier
          level
          minSkill
          maxSkill
        }
        skill
      }
      skillScores {
        name
        score
      }
    }
  }
`;
export const GET_USER_PLAYS_AGG = `
  query GetAimlabProfileAgg($where: AimlabPlayWhere!) {
    aimlab {
      plays_agg(where: $where) {
        group_by {
          task_id
          task_name
        }
        aggregate {
          count
          avg {
            score
            accuracy
          }
          max {
            score
            accuracy
            created_at
          }
        }
      }
    }
  }
`;
//$slug = String! variable for task id
export const GET_TASK_BY_ID = `
  query getTasksById($slug: String!) {
    aimlab {
      task(slug: $slug) {
        id
        name
        weapon_id
        description
        image_url
        author_id
        author{
            username
        }
        created_at
        workshop_id
    }
    }
  }
`;
export const GET_TASKS_BY_NAME = `
  query getTasksByName($name:String!) {
    aimlab {
      tasks(name:$name) {
        name 
        id 
        weapon_id
        description 
        image_url 
          author{
              id
              username
          }
      }
    }
  }
`;

export const GET_TASK_LEADERBOARD = `
  query getAimlabLeaderboard($leaderboardInput:LeaderboardInput!){
    aimlab{
        leaderboard(input: $leaderboardInput){
            id
            source
            metadata{
                offset
                rows
                totalRows
            }
            schema{
                id
                fields
            }
            data
        }
    }
  }
`;

export const GET_SEASONS = `
  query getAimlabSeason($activeOnly: Boolean!){
    seasons(activeOnly: $activeOnly) {
        id,
        name,
        description,
        startDate,
        endDate,
        active,
        createdAt,
        updatedAt,
        tasks {
            seasonId,
            taskId,
            sortOrder,
            weaponId,
            modeId
        }
    }
  }
`;

export const GET_TASK_INFORMATION = `
  query GetAimlabTaskInformation($slug: String!) {
    aimlab {
        task(slug: $slug) {
            id,
            name
        }
    }
  }
`;

export const GET_SEASONAL_COMBINED_LEADERBOARD = `
  query getAimlabSeasonalCombinedLeaderboard($leaderboardInput: LeaderboardInput!) {
    aimlab {
        leaderboard(input: $leaderboardInput) {
            profiles {
                username,
                rank {
                    rank {
                        displayName
                    }
                }
            },
            data,
            source,
            schema {
                id,
                columns {
                    name,
                    reverse,
                    format,
                    precision,
                    label,
                    description
                }
            },
            metadata {
                offset,
                rows,
                totalRows
            },
        }
    }
  }
`;

export const GET_TOP_CREATORS = `
  query GetAimlabTopCreators($limit: Int = 10, $offset: Int = 0) {
    authors(offset: $offset, limit: $limit) {
      id
      username
      d7Users
      d7Plays
      tasks(offset: 0, limit: 1) {
        id
        name
        imageUrl
        description
      }
    }
  }
`;

export const GET_TOTAL_POINTS = `
  query getTotalPoints($user_id: String) {
    aimlab {
        plays_agg(where: $where) {
        aggregate {
          sum {
            score
            shots_fired
            kills
          }
        }
      }
    }
  }
`;

export const GET_TIME_PLAYED = `
  query getTimePlayed($user_id: String) {
    aimlab {
        plays_agg(where: $where) {
        aggregate {
          uniq {
            days
            weeks
          }
        }
      }
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function APIFetch(query: any, variables: any) {
  try {
    const response = await axios({
      method: "POST",
      url: API_ENDPOINT,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        query: query,
        variables: variables,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error(error);
  }
}
