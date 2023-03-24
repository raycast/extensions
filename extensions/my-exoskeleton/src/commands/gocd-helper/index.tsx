import moment from 'moment'
import { ActionPanel, List, Action, getPreferenceValues, Toast, showToast, Icon, Color } from '@raycast/api'
import { useEffect, useState } from 'react'
import { isEmpty, findIndex, orderBy, first, reject } from 'lodash'
import { getDashboard } from '../../apis/gocd'
import { Pipeline, Stage } from '../../apis/types/gocd.type'
import { getItem, removeCache, setItem, StoreKeys } from '../../store'
import { PipelineDetails } from './Details'
import { getStageIconByStatus } from '../../utils/gocd'

interface StarPipelineItem {
  name: string
  timestamp: number
}

function getCurrentTimestamp() {
  return new Date().getTime()
}

async function getPipelines(): Promise<Pipeline[]> {
  const { data } = await getDashboard()
  const {
    _embedded: { pipelines }
  } = data

  return pipelines
}

function recordCurrentPipelineIsVisited(pipeline: Pipeline, callback?: (value?: Pipeline[]) => void) {
  const starList: StarPipelineItem[] = getItem(StoreKeys.StarPipeline) || []
  const index = findIndex(starList, ['name', pipeline.name])
  const timestamp = getCurrentTimestamp()
  if (index > -1) {
    starList[index].timestamp = timestamp
  } else {
    starList.push({ name: pipeline.name, timestamp })
  }
  setItem(StoreKeys.StarPipeline, starList)

  if (callback) {
    callback()
  }
}

function getVisitedListOnStore(pipelines: Pipeline[]): Pipeline[] {
  const starList: StarPipelineItem[] = getItem(StoreKeys.StarPipeline) || []
  const visitedPipelineList: Pipeline[] = []

  starList.forEach((item) => {
    const index = findIndex(pipelines, ['name', item.name])
    if (index > 0) {
      visitedPipelineList.push({ ...pipelines[index], ...item })
    }
  })

  return orderBy(visitedPipelineList, 'timestamp', 'desc')
}

function getLastTriggerTime(pipeline: Pipeline): string {
  const { instances = [] } = pipeline._embedded
  const instance = isEmpty(instances) ? undefined : first(instances)
  return instance ? moment(instance.scheduled_at).format('MM-DD HH:mm') : ''
}

function getLastStage(stages: Stage[]): Stage {
  const firstUnknownStageIndex = findIndex(stages, (stage) => {
    return stage.status === 'Unknown'
  })
  if (firstUnknownStageIndex > 0) {
    return stages[firstUnknownStageIndex - 1]
  }
  return stages[stages.length - 1]
}

function getInstance(pipeline: Pipeline) {
  const instances = pipeline._embedded.instances
  return first(instances)
}

function getInstanceCounter(pipeline: Pipeline) {
  const instance = getInstance(pipeline)
  return instance?.counter
}

function getLastStatus(pipeline: Pipeline) {
  const instance = getInstance(pipeline)
  if (instance) {
    const {
      _embedded: { stages = [] }
    } = instance
    const counter = getInstanceCounter(pipeline) || '-'
    const lastStage = getLastStage(stages)
    const icon = getStageIconByStatus(lastStage.status)

    return [
      {
        text: `${counter} ${lastStage.name.toUpperCase()}`
      },
      {
        text: { value: lastStage.status, color: icon.tintColor },
        icon
      }
    ]
  }
  return []
}

function removeStarPipelineFromCache(pipeline: Pipeline, callback?: (value?: Pipeline[]) => void) {
  const name = pipeline.name
  const items = getItem(StoreKeys.StarPipeline) || []
  const filteredItems = reject(items, (item) => item.name === name)

  setItem(StoreKeys.StarPipeline, filteredItems)

  showToast({
    style: Toast.Style.Success,
    title: 'Remove Cache Success'
  })

  if (callback) {
    callback()
  }
}

function clearStarPipelinesCache() {
  removeCache(StoreKeys.StarPipeline)
  showToast({
    style: Toast.Style.Success,
    title: 'Clear Cache Success'
  })
}

function isCurrentStatus(pipeline: Pipeline, currentStatus: string) {
  if (!currentStatus) {
    return true
  }

  const instance = getInstance(pipeline)

  if (instance) {
    const {
      _embedded: { stages = [] }
    } = instance
    const lastStage = getLastStage(stages)

    return lastStage.status === currentStatus
  }

  return false
}

function getPipelineUrlByName(pipelineName: string) {
  const { baseUrl } = getPreferenceValues()
  return `${baseUrl}/go/pipeline/activity/${pipelineName}`
}

export function GoCDPipelineCommand() {
  const [keyword, setKeyword] = useState('')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [visitedPipelines, setStarPipelines] = useState<Pipeline[]>([])
  const [selectedStatus, setStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  function filterByKeywordAndStatus(pipeline: Pipeline) {
    return pipeline.name.includes(keyword) && isCurrentStatus(pipeline, selectedStatus)
  }

  function updatePipelines(_pipelines?: Pipeline[]) {
    if (_pipelines) {
      setPipelines(_pipelines)
    }
    setStarPipelines(getVisitedListOnStore(_pipelines || pipelines))
  }

  function loadData(isReload = false) {
    getPipelines().then((_pipeline) => {
      updatePipelines(_pipeline)
      if (isReload) {
        showToast({
          style: Toast.Style.Success,
          title: 'Reload Success'
        })
      }
    })
  }

  // function getRunStageActionTitle() {
  //   return 'Run Stage'
  // }

  // function getCanRunStage(pipeline: Pipeline) {
  //   const instance = getInstance(pipeline)
  //   const stages = instance?._embedded.stages || []
  //   const canRunStages = stages.filter(stage => stage.)
  //   if (!isEmpty(stages)) {
  //     return instance?.counter
  //   }
  //   return last(canRunStages)?.name
  // }

  // function runStageAction(pipeline: Pipeline) {
  //   const { name,  } = pipeline
  //   const counter = getInstanceCounter(pipeline)
  //   const stageName = getCanRunStage(pipeline)

  //   if (name && counter && stage) {
  //     runStage(name, counter, stage)
  //   }
  // }

  function renderListItem(pipeline: Pipeline) {
    const isCacheItem = !!pipeline.timestamp

    return (
      <List.Item
        icon="icons/command-gocd-icon.png"
        key={pipeline.name}
        title={pipeline.name}
        subtitle={getLastTriggerTime(pipeline)}
        accessories={getLastStatus(pipeline)}
        actions={
          <ActionPanel title={pipeline.name}>
            {/* <Action title={getRunStageActionTitle()} shortcut={{ modifiers: ["cmd"], key: "t" }} onAction={() => runStageAction(pipeline)} icon={Icon.RotateClockwise} /> */}
            <Action.Push
              title="Enter Details"
              target={<PipelineDetails pipelineName={pipeline.name} />}
              icon={Icon.ArrowRight}
            />
            <Action.OpenInBrowser
              title="Open Browser"
              url={getPipelineUrlByName(pipeline.name)}
              shortcut={{ modifiers: ['cmd'], key: 'enter' }}
              onOpen={() => recordCurrentPipelineIsVisited(pipeline, updatePipelines)}
            />
            {!isCacheItem && (
              <Action
                title="Add To Star"
                shortcut={{ modifiers: ['cmd'], key: 's' }}
                onAction={() => recordCurrentPipelineIsVisited(pipeline, updatePipelines)}
                icon={Icon.Star}
              />
            )}
            {isCacheItem && (
              <Action
                title="Top Star"
                shortcut={{ modifiers: ['cmd'], key: 's' }}
                onAction={() => recordCurrentPipelineIsVisited(pipeline, updatePipelines)}
                icon={Icon.Star}
              />
            )}
            {isCacheItem && (
              <Action
                title="Remove Star"
                shortcut={{ modifiers: ['cmd'], key: 'd' }}
                onAction={() => removeStarPipelineFromCache(pipeline, updatePipelines)}
                icon={{ source: Icon.MinusCircle, tintColor: Color.Yellow }}
              />
            )}
            {isCacheItem && (
              <Action
                title="Clear Star"
                shortcut={{ modifiers: ['shift', 'cmd'], key: 'delete' }}
                onAction={clearStarPipelinesCache}
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
              />
            )}
            <Action
              title="Refresh"
              shortcut={{ modifiers: ['cmd'], key: 'r' }}
              onAction={() => loadData(true)}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel>
        }
      />
    )
  }

  return (
    <List
      isLoading={!pipelines.length}
      searchText={keyword}
      onSearchTextChange={setKeyword}
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Items" onChange={setStatus}>
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Item title="Passed" value="Passed" />
          <List.Dropdown.Item title="Failed" value="Failed" />
          <List.Dropdown.Item title="Building" value="Building" />
          <List.Dropdown.Item title="Cancelled" value="Cancelled" />
        </List.Dropdown>
      }
    >
      <List.Section title="Star">{visitedPipelines.filter(filterByKeywordAndStatus).map(renderListItem)}</List.Section>
      <List.Section title="All">{pipelines.filter(filterByKeywordAndStatus).map(renderListItem)}</List.Section>
    </List>
  )
}
