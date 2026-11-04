import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  List,
  useNavigation,
} from "@raycast/api"
import * as Arr from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import { useEffect, useState } from "react"
import { GrokRuntime } from "./lib/grok.ts"
import { ModelCatalog, type GrokModel, type ModelKind, type Token } from "./lib/models.ts"
import type { XaiFailure } from "./lib/xai.ts"

type State = Data.TaggedEnum<{
  Loading: {}
  Loaded: { readonly models: ReadonlyArray<GrokModel> }
  Failed: { readonly failure: XaiFailure }
}>
const State = Data.taggedEnum<State>()

const SECTIONS: ReadonlyArray<{ readonly kind: ModelKind; readonly title: string }> = [
  { kind: "language", title: "Language" },
  { kind: "image", title: "Image" },
  { kind: "video", title: "Video" },
]

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })
const numberFormat = new Intl.NumberFormat()

export default function Models() {
  const [state, setState] = useState<State>(State.Loading())
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const fiber = GrokRuntime.runFork(
      ModelCatalog.use((catalog) => catalog.list).pipe(
        Effect.map((models) => State.Loaded({ models })),
        Effect.catchTag("ModelsError", (failure) => Effect.succeed(State.Failed({ failure }))),
        Effect.flatMap((next) => Effect.sync(() => setState(next))),
      ),
    )
    return () => {
      GrokRuntime.runFork(Fiber.interrupt(fiber))
    }
  }, [attempt])

  const retry = () => {
    setState(State.Loading())
    setAttempt((count) => count + 1)
  }

  return State.$match(state, {
    Loading: () => <List isLoading searchBarPlaceholder="Search models" />,
    Failed: ({ failure }) => (
      <List searchBarPlaceholder="Search models">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load the models"
          description={failure.message}
          actions={
            <ActionPanel>
              {failure.reason === "signIn" ? <SignInAction /> : null}
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
            </ActionPanel>
          }
        />
      </List>
    ),
    Loaded: ({ models }) => (
      <List isShowingDetail={models.length > 0} searchBarPlaceholder="Search models">
        <List.EmptyView icon={Icon.ComputerChip} title="xAI listed no models for this account" />
        {SECTIONS.map((section) => (
          <List.Section key={section.kind} title={section.title}>
            {Arr.filter(models, (model) => model.kind === section.kind).map((model) => (
              <List.Item
                key={model.id}
                title={model.id}
                keywords={[...model.aliases]}
                icon={kindIcon(model.kind)}
                detail={<ModelDetail model={model} />}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Model ID" content={model.id} />
                    {model.kind === "language" ? (
                      <Action.Push
                        title="Count Tokens"
                        icon={Icon.Hashtag}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        target={<CountTokens model={model.id} />}
                      />
                    ) : null}
                    {Arr.match(model.aliases, {
                      onEmpty: () => null,
                      onNonEmpty: (aliases) => (
                        <Action.CopyToClipboard
                          title="Copy Aliases"
                          content={aliases.join(", ")}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                      ),
                    })}
                    <Action
                      title="Reload"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={retry}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
      </List>
    ),
  })
}

const kindIcon = (kind: ModelKind) =>
  Match.value(kind).pipe(
    Match.when("language", () => Icon.Message),
    Match.when("image", () => Icon.Image),
    Match.when("video", () => Icon.FilmStrip),
    Match.exhaustive,
  )

function ModelDetail({ model }: { readonly model: GrokModel }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model.id} />
          <List.Item.Detail.Metadata.Label title="Version" text={model.version} />
          <List.Item.Detail.Metadata.Label title="Added" text={dateFormat.format(model.created)} />
          {Option.match(model.contextLength, {
            onNone: () => null,
            onSome: (length) => (
              <List.Item.Detail.Metadata.Label
                title="Context"
                text={`${numberFormat.format(length)} tokens`}
              />
            ),
          })}
          {Option.match(model.maxPromptLength, {
            onNone: () => null,
            onSome: (length) => (
              <List.Item.Detail.Metadata.Label
                title="Longest Prompt"
                text={`${numberFormat.format(length)} characters`}
              />
            ),
          })}
          <List.Item.Detail.Metadata.Separator />
          <TagRow title="Input" values={model.inputs} />
          <TagRow title="Output" values={model.outputs} />
          <TagRow title="Reasoning" values={model.reasoningEfforts} />
          <TagRow title="Aliases" values={model.aliases} />
        </List.Item.Detail.Metadata>
      }
    />
  )
}

function TagRow({
  title,
  values,
}: {
  readonly title: string
  readonly values: ReadonlyArray<string>
}) {
  return Arr.match(values, {
    onEmpty: () => null,
    onNonEmpty: (all) => (
      <List.Item.Detail.Metadata.TagList title={title}>
        {all.map((value) => (
          <List.Item.Detail.Metadata.TagList.Item key={value} text={value} />
        ))}
      </List.Item.Detail.Metadata.TagList>
    ),
  })
}

function SignInAction() {
  return (
    <Action
      title="Sign in to Grok"
      icon={Icon.Person}
      onAction={() =>
        void launchCommand({
          name: "account",
          type: LaunchType.UserInitiated,
          context: { signIn: true },
        })
      }
    />
  )
}

/** A form for the text, then the count from xAI's tokenizer for `model`. */
function CountTokens({ model }: { readonly model: string }) {
  const { push } = useNavigation()
  const [text, setText] = useState("")
  return (
    <Form
      navigationTitle={`Count Tokens for ${model}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Count Tokens"
            icon={Icon.Hashtag}
            onSubmit={() => push(<TokenCount model={model} text={text} />)}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`See how ${model} splits text into tokens.`} />
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Paste or type text"
        value={text}
        onChange={setText}
        error={text.trim() === "" ? "Enter some text" : undefined}
      />
    </Form>
  )
}

type CountState = Data.TaggedEnum<{
  Counting: {}
  Counted: { readonly tokens: ReadonlyArray<Token> }
  Failed: { readonly failure: XaiFailure }
}>
const CountState = Data.taggedEnum<CountState>()

function TokenCount({ model, text }: { readonly model: string; readonly text: string }) {
  const [state, setState] = useState<CountState>(CountState.Counting())

  useEffect(() => {
    const fiber = GrokRuntime.runFork(
      ModelCatalog.use((catalog) => catalog.tokenize(model, text)).pipe(
        Effect.map((tokens) => CountState.Counted({ tokens })),
        Effect.catchTag("ModelsError", (failure) => Effect.succeed(CountState.Failed({ failure }))),
        Effect.flatMap((next) => Effect.sync(() => setState(next))),
      ),
    )
    return () => {
      GrokRuntime.runFork(Fiber.interrupt(fiber))
    }
  }, [model, text])

  const metadata = (count: Option.Option<number>) => (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Model" text={model} />
      <Detail.Metadata.Label title="Characters" text={numberFormat.format(text.length)} />
      <Detail.Metadata.Label
        title="Tokens"
        text={Option.match(count, {
          onNone: () => "…",
          onSome: (tokens) => numberFormat.format(tokens),
        })}
      />
    </Detail.Metadata>
  )

  return CountState.$match(state, {
    Counting: () => <Detail isLoading markdown="" metadata={metadata(Option.none())} />,
    Failed: ({ failure }) => (
      <Detail
        markdown={failure.message}
        metadata={metadata(Option.none())}
        actions={<ActionPanel>{failure.reason === "signIn" ? <SignInAction /> : null}</ActionPanel>}
      />
    ),
    Counted: ({ tokens }) => (
      <Detail
        markdown={tokenMarkdown(tokens)}
        metadata={metadata(Option.some(tokens.length))}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Token Count" content={String(tokens.length)} />
            <Action.CopyToClipboard
              title="Copy Token IDs"
              content={tokens.map((token) => token.id).join(" ")}
            />
          </ActionPanel>
        }
      />
    ),
  })
}

const visible = (text: string) =>
  text.replaceAll("`", "ˋ").replaceAll(" ", "·").replaceAll("\n", "⏎")

/** At most this many tokens are listed, so a long text stays quick to show. */
const SHOWN_TOKENS = 500

/** Each token as inline code, with spaces as `·` and line breaks as `⏎` so they show. */
const tokenMarkdown = (tokens: ReadonlyArray<Token>): string => {
  const shown = Arr.take(tokens, SHOWN_TOKENS)
  const rest = tokens.length - shown.length
  return [
    `# ${numberFormat.format(tokens.length)} ${tokens.length === 1 ? "token" : "tokens"}`,
    "",
    shown.map((token) => `\`${visible(token.text)}\``).join(" "),
    ...(rest > 0 ? ["", `_And ${numberFormat.format(rest)} more._`] : []),
  ].join("\n")
}
