import { githubClient } from "../api/api"
import { useCachedState } from "@raycast/utils"
import { useEffect, useState } from "react"
import { LocalStorage } from "@raycast/api"
import {
  PrDetailsRes,
  PrReviewsRes,
  PullRequest,
  PullRequestDetails,
  PullRequestResponse,
  PullRequestReviews,
  Repo,
  Usages,
} from "../types/types"
import { PRS_DETAILS, PRS_REVIEWS, REPOS } from "../consts/consts"
import { getCalculatedScore } from "../utils/utils"

export const useRepos = () => {
  const [repos, setRepos] = useCachedState<Repo[]>(REPOS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    ;(
      githubClient.paginate(
        githubClient.rest.repos.listForAuthenticatedUser.endpoint.merge()
      ) as Promise<Repo[]>
    ).then((repos) => {
      setRepos(repos)
      setIsLoading(false)
    })
  }, [])

  return { data: repos, isLoading: isLoading }
}

export function useLocalStorage<T>(key: string) {
  const [state, setState] = useState<T>()
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const setItem = (value: any) => {
    LocalStorage.setItem(key, JSON.stringify(value))
    setState(value)
  }

  useEffect(() => {
    LocalStorage.getItem(key).then((item) => {
      setState(item && JSON.parse(item.toString()))
      setIsLoading(false)
    })
  }, [])

  return { data: state, set: setItem, isLoading }
}

export const usePrQuery = (query: string) => {
  const [data, setData] = useCachedState<PullRequest[]>(query)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    githubClient.rest.search
      .issuesAndPullRequests({
        per_page: 100,
        q: query,
      })
      .then((res: PullRequestResponse) => {
        setData(res.data.items)
        setIsLoading(false)
      })
  }, [query])

  return { data, isLoading }
}

export const usePrs = () => {
  const { data: myOpenPrs, isLoading: isMyOpenPrsLoading } = usePrQuery(
    "is:pr+author:@me+is:open"
  )
  const { data: mentionedPrs, isLoading: isMentionedPrsLoading } = usePrQuery(
    "is:pr+mentions:@me+review-requested:@me+is:open"
  )

  const [prsDetails, setPrsDetails] =
    useCachedState<Record<string, PullRequestDetails>>(PRS_DETAILS)
  const [prsReviews, setPrsReviews] =
    useCachedState<Record<string, PullRequestReviews>>(PRS_REVIEWS)

  const myOpenPrsUrls = myOpenPrs?.map((item) => item.url) || []
  const filteredMentionedPrs = mentionedPrs?.filter(
    (pr) => !myOpenPrsUrls.includes(pr.url)
  )

  useEffect(() => {
    const fetchDrillDownData = (prs: PullRequest[]) => {
      prs.forEach((pr: PullRequest) => {
        const { url, number } = pr
        const owner = url.split("/")[4]
        const repo = url.split("/")[5]
        const pull_number = number

        githubClient.pulls
          .listReviews({
            owner,
            repo,
            pull_number,
          })
          .then((reviewsRes: PrReviewsRes) => {
            const reviews = reviewsRes.data
            setPrsReviews((prevState = {}) => ({
              ...prevState,
              [pr.id]: reviews,
            }))
          })

        githubClient.rest.pulls
          .get({
            owner,
            repo,
            pull_number,
          })
          .then((detailsRes: PrDetailsRes) => {
            const prDetails = detailsRes.data
            setPrsDetails((prevState = {}) => ({
              ...prevState,
              [pr.id]: prDetails,
            }))
          })
      })
    }
    if (myOpenPrs) {
      fetchDrillDownData(myOpenPrs)
    }

    if (filteredMentionedPrs) {
      fetchDrillDownData(filteredMentionedPrs)
    }
  }, [!!myOpenPrs, !!filteredMentionedPrs])

  return {
    myOpenPrs,
    mentionedPrs: filteredMentionedPrs,
    prsDetails,
    prsReviews,
    isLoading: isMyOpenPrsLoading || isMentionedPrsLoading,
  }
}

export const useUsageBasedSort = <T extends { id: string | number }>(
  data: T[],
  localStorageKey: string
) => {
  const { data: usages, set: setUsages } = useLocalStorage<Usages>(
    "scores-" + localStorageKey
  )

  const use = (id: string | number) => {
    setUsages({
      ...usages,
      [id]: {
        lastUsed: new Date(),
        usageCount: (usages?.[id]?.usageCount || 0) + 1,
      },
    })
  }

  const arrayWithScores = data.map((e: T) => {
    const usage = (usages || {})[e.id]
    return {
      ...e,
      _calculatedScore: getCalculatedScore(usage),
    }
  })

  const sortedByScores = [...(arrayWithScores || [])].sort(
    (a, b) => b._calculatedScore - a._calculatedScore
  )

  return { data: sortedByScores, use }
}
