import moment from 'moment'
import { useEffect, useMemo, useState } from 'react'
import { isEmpty, findIndex } from 'lodash'
import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List, showToast, Toast } from '@raycast/api'
import { Pipeline, Stage } from '../../apis/types/gocd.type'
import { StageStatus } from '../../constants/gocd'
import { getStageIconByStatus } from '../../utils/gocd'
import { Configurations, withConfig } from '../../utils/configurationCenter'
import { buildGoCDClient } from '../../apis/gocd'

interface IPipelineDetailsProps {
  pipelineName: string
}

function getStageItems(stages: Stage[]) {
  if (!isEmpty(stages)) {
    return stages.map((stage) => {
      return {
        text: stage.name.toUpperCase(),
        icon: getStageIconByStatus(stage.status),
        ...stage
      }
    })
  }
  return []
}

function getTriggerUser(pipeline: Pipeline) {
  const messageArray = pipeline.build_cause.trigger_message.split(' ')

  if (!messageArray[3] || messageArray[3].startsWith('<')) {
    return messageArray[2].toLowerCase()
  }
  return [messageArray[2], messageArray[3]].map((item) => item.toLowerCase()).join('.')
}

function getTime(pipeline: Pipeline) {
  return pipeline.scheduled_date ? moment(pipeline.scheduled_date).format('MM/DD HH:mm') : ''
}

function getLastStageStatus(stages: Stage[]) {
  const firstUnknownStageIndex = findIndex(stages, (stage) => {
    return stage.status === StageStatus.Unknown
  })

  const getStageStatus = (stage: Stage) => {
    return stage.status
  }

  if (firstUnknownStageIndex > 0) {
    return getStageStatus(stages[firstUnknownStageIndex - 1])
  }
  return getStageStatus(stages[stages.length - 1])
}

export const PipelineDetails = withConfig(
  ({
    configurations: { gocdPAT, gocdBaseUrl },
    pipelineName
  }: IPipelineDetailsProps & {
    configurations: Configurations
  }) => {
    const [histories, setHistories] = useState<Pipeline[]>([])
    const { baseUrl } = getPreferenceValues()
    const gocdClient = useMemo(() => buildGoCDClient(gocdBaseUrl, gocdPAT), [gocdPAT, gocdBaseUrl])

    useEffect(() => {
      loadData()
    }, [])

    function loadData(isReload = false) {
      gocdClient.getPipelineHistory(pipelineName).then((res) => {
        setHistories(res.data.pipelines)
        if (isReload) {
          showToast({
            style: Toast.Style.Success,
            title: 'Reload Success'
          })
        }
      })
    }

    return (
      <List isShowingDetail>
        {histories.map((pipeline) => (
          <List.Item
            key={pipeline.counter}
            title={pipeline.counter.toString()}
            subtitle={getTriggerUser(pipeline)}
            accessories={[{ text: getTime(pipeline) }]}
            icon={getStageIconByStatus(getLastStageStatus(pipeline.stages))}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={`${pipeline.name}:${pipeline.counter}`} />
                    <List.Item.Detail.Metadata.Label
                      title={`Trigger Message: ${pipeline.build_cause.trigger_message}`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Stages:" />
                    {getStageItems(pipeline.stages).map((item, index) => (
                      <>
                        <List.Item.Detail.Metadata.Label
                          key={item.text + index}
                          title={item.text}
                          icon={item.icon}
                          text={{ value: item.status, color: item.icon.tintColor }}
                        />
                      </>
                    ))}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Modifications:" />
                    {pipeline.build_cause.material_revisions.map((item) => {
                      return item.modifications.map((modification) => (
                        <List.Item.Detail.Metadata.Label title={modification.comment} />
                      ))
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel title={pipeline.name}>
                {/* <Action.Push title="Enter Details" target={<PipelineDetails pipelineName={pipeline.name} />} onPush={() => recordCurrentPipelineIsVisited(pipeline, updatePipelines)} icon={Icon.ArrowRight} /> */}
                <Action.OpenInBrowser
                  title="Open Browser"
                  url={`${baseUrl}/pipeline/activity/${pipeline.name}`}
                  shortcut={{ modifiers: [], key: 'enter' }}
                />
                <Action
                  title="Reload Data"
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  onAction={() => loadData(true)}
                  icon={Icon.RotateClockwise}
                />
                <Action
                  title="Copy Pipeline Counter"
                  shortcut={{ modifiers: ['shift', 'cmd'], key: 'c' }}
                  onAction={() => {
                    Clipboard.copy(`${pipeline.name}:${pipeline.counter}`)
                  }}
                  icon={Icon.CopyClipboard}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    )
  }
)
