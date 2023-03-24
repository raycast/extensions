import { List } from '@raycast/api'
import { CDClient } from './client'
import { StageStatus } from './types'
import moment from 'moment'
import { IconMap } from './constants'
import { calculateStatus } from './utils'

export default function PipelineDetailCommand(pros: { pipelineName: string }) {
  // const { data: status } = CDClient.fetchPipelineStatus(pros.pipelineName);
  const { data: history } = CDClient.fetchPipelineHistory(pros.pipelineName)

  return (
    <List navigationTitle={pros.pipelineName} isShowingDetail>
      {history?.pipelines.map((pipelineInstance) => {
        const status = calculateStatus(pipelineInstance.stages)
        const runAt = moment(pipelineInstance.scheduled_date).format('YYYY-MM-DD hh:mm:ss')

        return (
          <List.Item
            title={pipelineInstance.label}
            subtitle={runAt}
            icon={IconMap[status]}
            key={pipelineInstance.counter}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Trigger"
                      text={pipelineInstance.build_cause.trigger_message}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {pipelineInstance.stages.map((s) => (
                      <List.Item.Detail.Metadata.Label title={s.name} icon={IconMap[s.status]} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        )
      })}
    </List>
  )
}
