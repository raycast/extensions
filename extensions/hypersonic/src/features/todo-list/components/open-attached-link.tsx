import {
  discord,
  figma,
  github,
  gitlab,
  linear,
  notion,
  slack,
  twitter,
  youtube,
} from '@/utils/icons'
import { Action, getApplications, Icon, open } from '@raycast/api'
import { useMemo } from 'react'

const INTERNAL_URL = {
  notion: 'notion://',
  discord: 'discord://',
  linear: 'linear://',
}

const ACTION_DATA = {
  notion: {
    title: 'Open URL in Notion',
    icon: { source: notion },
  },
  discord: {
    title: 'Open URL in Discord',
    icon: { source: discord },
  },
  figma: {
    title: 'Open URL in Figma',
    icon: { source: figma },
  },
  slack: {
    title: 'Open URL in Slack',
    icon: { source: slack },
  },
  linear: {
    title: 'Open URL in Linear',
    icon: { source: linear },
  },
  github: {
    title: 'Open URL in GitHub',
    icon: { source: github },
  },
  gitlab: {
    title: 'Open URL in GitLab',
    icon: { source: gitlab },
  },
  youtube: {
    title: 'Open URL in YouTube',
    icon: { source: youtube },
  },
  twitter: {
    title: 'Open URL in Twitter',
    icon: { source: twitter },
  },
}

const getActionData = (url: string) => {
  const matches = Object.keys(ACTION_DATA).find((app) =>
    url.includes(app)
  ) as keyof typeof ACTION_DATA

  if (!matches) {
    return {
      title: 'Open Content URL',
      icon: Icon.Link,
    }
  }

  return ACTION_DATA[matches]
}

export function OpenAttachedLink({ url }: { url: string }) {
  const data = useMemo(() => getActionData(url), [url])

  const handleOpen = async () => {
    const matches = Object.keys(INTERNAL_URL).find((app) =>
      url.includes(app)
    ) as keyof typeof INTERNAL_URL

    if (!matches) {
      await open(url)
      return
    }

    const apps = await getApplications()
    const isInstalled = apps.some((app) => app.name.toLowerCase() === matches)

    if (!isInstalled) {
      await open(url)
      return
    }

    const internalUrl = url.replace('https://', INTERNAL_URL[matches])
    await open(internalUrl)
  }

  return (
    <Action
      title={data.title}
      icon={data.icon}
      onAction={handleOpen}
      shortcut={{ modifiers: ['cmd'], key: 'e' }}
    />
  )
}
