import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  open,
  openCommandPreferences,
  popToRoot,
  showHUD,
  showToast,
  Toast
} from "@raycast/api"
import { useEffect, useRef, useState } from "react"
import type { Preferences } from "./typings"
import {
  creatNote,
  dateFormat,
  getSelectedTextLink,
  isMarginNoteInstalled,
  unique
} from "./utils"

interface FormType {
  title: string
  excerptText: string
  commentText: string
  customTags: string
  commonTags: string[]
  link: string
  color: string
}

interface ParentNote {
  id: string
  title: string
}

const preferences = getPreferenceValues<Preferences>()
const parentNotes = [
  preferences.parentNote1,
  preferences.parentNote2,
  preferences.parentNote3,
  preferences.parentNote4,
  preferences.parentNote5
].reduce((acc, k, i) => {
  if (!k) return acc
  k = k.trim()
  const title = k.match(/^(.+)=marginnote/)
  const id = k.match(/marginnote3app:\/\/note\/(.+)$/)
  if (!id) return acc
  acc.push({
    title: "Create to " + (title ? title[1] : "Parent Note " + (i + 1)),
    id: id[1]
  })
  return acc
}, [] as ParentNote[])

const commonTags = preferences.commonTags?.split(/[ #]+/).filter(k => k) ?? []
const colors = [
  ["Light Yellow", "#E9E38C"],
  ["Light Green", "#AEE39D"],
  ["Light Blue", "#9DBCD1"],
  ["light Red", "#E9979D"],
  ["Yellow", "#E9E406"],
  ["Green", "#03E406"],
  ["Blue", "#01AAD2"],
  ["Red", "#E90204"],
  ["Orange", "#E87305"],
  ["Dark Green", "#007335"],
  ["Dark Blue", "#013895"],
  ["Dark Red", "#BD1911"],
  ["White", "#E9E4D2"],
  ["Light Grey", "#C6C3B4"],
  ["Dark Grey", "#A4A295"],
  ["Purple", "#B28DB9"]
]

const today = dateFormat(new Date(), "YYYYmmdd")

export default function (props: { draftValues?: FormType }) {
  const { draftValues } = props
  const error = useRef(false)
  const [textEmptyError, setTextEmptyError] = useState<string | undefined>()
  const [excerptText, setExcerptText] = useState(draftValues?.excerptText ?? "")
  const [comment, setComment] = useState(draftValues?.commentText ?? "")
  const [link, setLink] = useState(draftValues?.link ?? "")

  function dropTextEmptyError() {
    if (textEmptyError) {
      setTextEmptyError(undefined)
    }
  }
  async function fetchExcerptLink() {
    const ret = await getSelectedTextLink()
    if (!excerptText) setExcerptText(ret.text)
    if (!link) setLink(ret.link)
  }

  async function creat(form: FormType, node: ParentNote, willOpenNote = false) {
    if (form.excerptText || form.commentText) {
      dropTextEmptyError()
      const tags = [
        ...form.commonTags,
        ...form.customTags.split(/[ #]+/)
      ].reduce((acc, k) => {
        if (k && !acc.includes(k)) {
          acc.push(k === "today" ? today : k)
        }
        return acc
      }, [] as string[])
      const error = await creatNote(
        {
          title: form.title,
          excerptText: form.excerptText,
          commentText: form.commentText,
          tags: unique(tags)
            .map(k => "#" + k)
            .join(" "),
          link: form.link,
          color: form.color
        },
        node.id,
        willOpenNote
      )
      if (error) throw new Error("Parent note not found")
      preferences.showConfetti && open("raycast://confetti")
      showHUD("Creat Note Successfully")
      popToRoot()
      closeMainWindow()
    } else {
      setTextEmptyError("One of the fields should't be empty")
      throw new Error("One of the fields should't be empty")
    }
  }

  async function alertError() {
    if (!(await isMarginNoteInstalled())) {
      showToast(Toast.Style.Failure, "Error", "MarginNote 3 is not installed")
      return true
    } else if (parentNotes.length === 0) {
      showToast(
        Toast.Style.Failure,
        "Error",
        "Parent note url is in error format"
      )
      return true
    }
  }

  useEffect(() => {
    dropTextEmptyError()
  }, [comment, excerptText])

  useEffect(() => {
    fetchExcerptLink()
    alertError()
  }, [])

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          {parentNotes.length ? (
            parentNotes
              .map((k, index) => [
                <Action.SubmitForm
                  title={k.title}
                  key={index * 2}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: `${index + 1}` as Keyboard.KeyEquivalent
                  }}
                  onSubmit={async (v: FormType) => {
                    if (await alertError()) return
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Creating Note..."
                    })
                    try {
                      await creat(v, k)
                      toast.style = Toast.Style.Success
                      toast.title = "Creat Note Successfully"
                    } catch (err: any) {
                      toast.style = Toast.Style.Failure
                      toast.title = "Failed to Create Note"
                      toast.message = err.message
                    }
                  }}
                />,
                <Action.SubmitForm
                  title={k.title + " and Open"}
                  key={index * 2 + 1}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: `${index + 1}` as Keyboard.KeyEquivalent
                  }}
                  onSubmit={async (v: FormType) => {
                    if (await alertError()) return
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Creating Note and Open..."
                    })
                    try {
                      await creat(v, k, true)
                      toast.style = Toast.Style.Success
                      toast.title = "Creat Note Successfully"
                    } catch (err: any) {
                      toast.style = Toast.Style.Failure
                      toast.title = "Failed to Create Note"
                      toast.message = err.message
                    }
                  }}
                />
              ])
              .flat()
          ) : (
            <Action
              title="Open Extension Preferences"
              onAction={openCommandPreferences}
            ></Action>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        placeholder={`use ";" to add multiple titles`}
        title="Title"
        defaultValue={draftValues?.title}
      />
      <Form.TextArea
        id="excerptText"
        title="Excerpt Text"
        placeholder="some text you want to excerpt"
        error={excerptText ? undefined : textEmptyError}
        onChange={text => {
          setExcerptText(text)
        }}
        value={excerptText}
      />
      <Form.TextArea
        id="commentText"
        title="Comment Text"
        autoFocus={true}
        onChange={text => {
          setComment(text)
        }}
        error={comment ? undefined : textEmptyError}
        placeholder="some text about your feelings or thoughts"
      />
      <Form.TextField
        id="link"
        title="Excerpt Link"
        value={link}
        onChange={setLink}
      />
      <Form.TagPicker
        id="commonTags"
        title="Common Tags"
        defaultValue={draftValues?.commonTags}
      >
        <Form.TagPicker.Item value="today" title={today} icon="📅" />
        {commonTags.map(k => (
          <Form.TagPicker.Item value={k} title={k} key={k} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        id="customTags"
        title="Custom Tags"
        placeholder="#tag1 #tag2"
        defaultValue={draftValues?.customTags}
      />
      <Form.Dropdown
        id="color"
        title="Color"
        storeValue={true}
        defaultValue={draftValues?.color}
      >
        <Form.Dropdown.Section>
          {colors.map((color, i) => (
            <Form.Dropdown.Item
              key={i}
              value={String(i)}
              title={color[0]}
              icon={{ source: Icon.CircleFilled, tintColor: color[1] }}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  )
}
