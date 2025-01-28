import { useEffect, useMemo, useState } from 'react'
import {
  ActionPanel,
  Action,
  Form,
  popToRoot,
  useNavigation,
  Toast,
  showToast,
  Icon,
  showHUD,
  getFrontmostApplication,
} from '@raycast/api'
import { runAppleScript } from '@raycast/utils'
import { useAtom } from 'jotai'
import { trpc } from './utils/trpc.util'
import { CachedQueryClientProvider } from './components/CachedQueryClientProvider'
import MyAccount from './views/MyAccount'
import { sessionTokenAtom } from './states/session-token.state'
import { recentSelectedSpaceAtom, recentSelectedTagsAtom } from './states/recent-selected.state'
import { LoginView } from './views/LoginView'

interface ScriptsPerBrowser {
  getURL: () => Promise<string>
  getTitle: () => Promise<string>

  // 브라우저 현재 페이지를 url로 설정한다.
  setUrl: (url: string) => Promise<void>
}

type Browser = 'chrome' | 'safari' | 'arc'

const actions: Record<Browser, ScriptsPerBrowser> = {
  chrome: {
    async getURL() {
      const result = await runAppleScript(`
        tell application "Google Chrome"
          get URL of active tab of first window
        end tell
      `)
      return result
    },
    async getTitle() {
      const result = await runAppleScript(`
        tell application "Google Chrome"
          get title of active tab of first window
        end tell
      `)
      return result
    },
    async setUrl(url: string) {
      await runAppleScript(`
        tell application "Google Chrome"
          set URL of active tab of window 1 to "${url}"
        end tell
      `)
    },
  },

  safari: {
    async getURL() {
      const result = await runAppleScript(`
        tell application "Safari" to get URL of front document
      `)
      return result
    },
    async getTitle() {
      const result = await runAppleScript(`
        tell application "Safari"
          get title of active tab of first window
        end tell
      `)
      return result
    },
    async setUrl(url: string) {
      await runAppleScript(`
        tell application "Safari"
          set URL of current tab of front window to "${url}"
        end tell
      `)
    },
  },

  arc: {
    async getURL() {
      const result = await runAppleScript(`
        tell application "Arc"
          get URL of active tab of first window
        end tell
      `)
      return result
    },
    async getTitle() {
      const result = await runAppleScript(`
        tell application "Arc"
          get title of active tab of first window
        end tell
      `)
      return result
    },
    async setUrl(url: string) {
      await runAppleScript(`
        tell application "Arc"
          set URL of active tab of front window to "${url}"
        end tell
      `)
    },
  },
}

const actionsByBrowserName: { [key: string]: ScriptsPerBrowser } = {
  'Google Chrome': actions.chrome,
  Safari: actions.safari,
  Arc: actions.arc,
}

async function getCurrentBrowserPageInfo() {
  try {
    const frontmostApp = await getFrontmostApplication()
    const action = actionsByBrowserName[frontmostApp.name] || null

    if (!action) {
      return
    }

    const currentBrowserUrl = await action.getURL()
    const currentBrowserTitle = await action.getTitle()

    return {
      browser: action !== null ? frontmostApp.name : null,
      title: currentBrowserTitle,
      url: currentBrowserUrl,
    }
  } catch (e) {
    return undefined
  }
}

function Body(props: { onlyPop?: boolean }) {
  const { onlyPop = false } = props
  const { pop } = useNavigation()
  const [title, setTitle] = useState<string>('')
  const [url, setUrl] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [sessionToken, setSessionToken] = useAtom(sessionTokenAtom)
  const [selectedSpace, setSelectedSpace] = useAtom(recentSelectedSpaceAtom)
  const [selectedTags, setSelectedTags] = useAtom(recentSelectedTagsAtom)

  useEffect(() => {
    getCurrentBrowserPageInfo().then((info) => {
      setTitle(info ? info.title : '')
      setUrl(info ? info.url : '')
    })
  }, [])

  const me = trpc.user.me.useQuery(undefined, {
    queryHash: sessionToken,
    enabled: !!sessionToken,
  })

  const { data: allTags } = trpc.tag.list.useQuery(
    {
      spaceIds: me?.data?.associatedSpaces.map((space) => space.id) ?? [],
    },
    {
      enabled: !!me.data,
    }
  )

  const tags = useMemo(() => {
    if (!allTags) {
      return undefined
    }

    if (selectedSpace === 'email') {
      return []
    }

    return allTags?.filter((tag) => tag.spaceId === selectedSpace)
  }, [allTags, selectedSpace])

  const tagValues = useMemo(
    () => selectedTags.map((tag) => tag.id).filter((id) => tags?.find((p) => p.id === id)),
    [selectedTags, tags]
  )

  const bookmarkCreate = trpc.bookmark.create.useMutation()

  // const handleSubmit = async (form: { title: string; url: string; description: string; owner: string }) => {
  const handleSubmit = async () => {
    await bookmarkCreate.mutateAsync({
      name: title,
      description: description,
      url: url,
      spaceId: selectedSpace,
      tags: selectedTags.map((tag) => tag.id),
    })

    if (onlyPop) {
      showToast({
        style: Toast.Style.Success,
        title: 'Bookmark added',
        message: 'Bookmark added successfully',
      })
      pop()
    } else {
      showHUD('Bookmark added')
      popToRoot({ clearSearchBar: true })
    }
  }

  const [after1Sec, setAfter1Sec] = useState(false)

  useEffect(() => {
    // 이게 없으면 아주 잠깐동안 Onboarding이 보이게됨.
    setTimeout(() => setAfter1Sec(true), 1000)
  }, [])

  useEffect(() => {
    if (!me.error) return

    // 토큰 만료등으로 로그인에 실패한 것.
    // sessionToken을 클리어 시키고 Onboarding으로 보낸다.
    console.log('🚀 ~ session clear')
    setSessionToken('')
  }, [me.error, setSessionToken])

  if (!sessionToken && after1Sec) {
    return <LoginView />
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action.Push
            title="My Account"
            icon={Icon.Person}
            target={<MyAccount />}
            onPush={() => {
              setAfter1Sec(false)
            }}
            onPop={() => {
              setTimeout(() => setAfter1Sec(true), 100)
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextField id="url" title="URL" value={url} onChange={setUrl} />

      <Form.Dropdown
        id="space"
        title="Space"
        defaultValue={selectedSpace}
        isLoading={!me.data}
        onChange={(value) => {
          setSelectedSpace(value)
        }}
      >
        {me.data?.associatedSpaces.map((s) => (
          <Form.Dropdown.Item key={s.id} value={s.id} title={s.name} icon={s.image || Icon.TwoPeople} />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="tag"
        title="Tags"
        value={tagValues}
        onChange={(values) => {
          if (!tags) return

          const selected = values
            .map((v) => ({ id: v, title: tags.find((p) => p.id === v)!.name }))
            .filter((tag) => tag.title)

          setSelectedTags(selected)
        }}
      >
        {!tags && selectedTags.map((tag) => <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.title} />)}
        {tags?.map((tag) => <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />)}
      </Form.TagPicker>

      <Form.TextArea id="description" title="Description" value={description} onChange={setDescription} />
    </Form>
  )
}

export default function AddBookmark(props: { onlyPop?: boolean }) {
  const { onlyPop = false } = props
  return (
    <CachedQueryClientProvider>
      <Body onlyPop={onlyPop} />
    </CachedQueryClientProvider>
  )
}
