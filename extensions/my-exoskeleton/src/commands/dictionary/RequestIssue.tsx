import {
  Action,
  ActionPanel,
  Icon,
  Form,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  getPreferenceValues
} from '@raycast/api'
import {
  CONFIG_COLLECTION_NAME,
  CreateTrelloCard,
  DictionaryPreference,
  RequestDictIssue,
  SCHEMA_NAME,
  TrelloConfig,
  TrelloListCard
} from '../../constants/dictionary'
import { useEffect, useState } from 'react'
import { buildExpression, getCollection, Operator } from '../../utils/mysql'
import { TrelloApiClient } from '../../apis/dictionary'

function RequestIssueForm(props: { dictName: string }) {
  const [dictionaryName, setDictionaryName] = useState(() => props.dictName)
  const [dictionaryNameContext, setDictionaryNameContext] = useState<string | ''>()
  const [yourName, setYourName] = useState<string | ''>()
  const [trelloConfig, setTrelloConfig] = useState<TrelloConfig | any>()

  const onChangeDictionaryName = (value: string) => {
    setDictionaryName(value)
  }

  const onChangeDictionaryNameContext = (value: string) => {
    setDictionaryNameContext(value)
  }

  const onChangeYourName = (value: string) => {
    setYourName(value)
  }

  const { dictionaryUrl } = getPreferenceValues<DictionaryPreference>()

  useEffect(() => {
    const queryTrelloConfigData = async () => {
      const collection = await getCollection(dictionaryUrl, SCHEMA_NAME, CONFIG_COLLECTION_NAME)
      const operation = Operator.and(Operator.eq('configName', ':configName'))

      const ex = buildExpression(operation)
      const rows = await collection.find(ex).bind('configName', 'trello').execute()
      const result = rows.fetchOne() as TrelloConfig
      setTrelloConfig(result)
    }
    queryTrelloConfigData()
  }, [])

  const submitIssueToTrello = (values: RequestDictIssue) => {
    TrelloApiClient.getBoardListCards(
      trelloConfig.trelloBaseUrl,
      trelloConfig.apiKey,
      trelloConfig.apiToken,
      trelloConfig.boardId
    )
      .then((listCards: Array<TrelloListCard>) => {
        const defaultListCard = listCards.find(
          (listCard) => listCard.name == trelloConfig.defaultListCardName
        ) as TrelloListCard
        const createTrelloCard: CreateTrelloCard = {
          name: `字典待解决问题——${values.dictName}`,
          desc: `名称: ${values.dictName} \n上下文: ${values.context} \n提交人: ${values.yourName} `,
          idList: defaultListCard.id
        }
        TrelloApiClient.createTrelloCard(
          trelloConfig.trelloBaseUrl,
          trelloConfig.apiKey,
          trelloConfig.apiToken,
          createTrelloCard
        )
          .then(() => {
            showToast({
              title: '提交问题成功!',
              style: Toast.Style.Success
            })
          })
          .catch(() => {
            showToast({
              title: '提交问题失败!',
              style: Toast.Style.Failure
            })
          })
      })
      .catch(() => {
        showToast({
          title: '提交问题失败!',
          style: Toast.Style.Failure
        })
      })
  }

  async function handleSubmit(values: RequestDictIssue) {
    if (dictionaryName && dictionaryNameContext && yourName) {
      const options: Alert.Options = {
        title: '确认提交',
        message: `确认有问题的字典名称为： ${values.dictName}`,
        primaryAction: {
          title: 'OK',
          onAction: () => {
            submitIssueToTrello(values)
          }
        }
      }
      await confirmAlert(options)
    } else {
      await showToast({
        title: '请完整填写所有必填字段!',
        style: Toast.Style.Failure
      })
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="提交问题" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="dictName"
        title="名称"
        placeholder="请输入存在问题的字典名称"
        onChange={(value) => onChangeDictionaryName(value)}
        value={dictionaryName}
      />
      <Form.TextField
        id="context"
        title="问题上下文"
        placeholder="请输入问题上下文"
        onChange={(value) => onChangeDictionaryNameContext(value)}
        value={dictionaryNameContext}
      />
      <Form.TextField
        id="yourName"
        title="你的名字"
        placeholder="请留下你的名字"
        onChange={(value) => onChangeYourName(value)}
        value={yourName}
      />
    </Form>
  )
}

export default function RequestIssue(props: { dictName: string }) {
  return (
    <Action.Push
      icon={Icon.QuestionMark}
      title="提交你的问题"
      shortcut={{ modifiers: ['cmd'], key: 'n' }}
      target={<RequestIssueForm dictName={props.dictName} />}
    />
  )
}
