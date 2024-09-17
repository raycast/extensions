import {List} from "@raycast/api"

// function ConfigMetaData({configVal}){
//   const buildMetaData = () => {
//     return <List.Item.Detail.Metadata.Label title={'metadata'} />
//   }
//   //Return regular string
//   if(typeof configVal === 'string' || configVal.length === 1 && 'value' in configVal[0]){
//     if(typeof configVal === 'string'){
//       return (
//         <List.Item.Detail markdown={configVal} />
//       )
//     }
//     return (
//       <List.Item.Detail markdown={configVal[0].value.toString()} />
//     )
//   }
//   //Return configs w/ single value entry
//   if('value' in configVal[0] && configVal.length === 1){
//     // return <List.Item.Detail markdown={configVal[0].value.toString()} />
//     return <List.Item.Detail markdown=""
//     metadata={
//       <List.Item.Detail.Metadata>
//         <List.Item.Detail.Metadata.Label title={configVal[0].pred.operator === "default" ? "everywhere": configVal[0].pred.operator}/>
//         <List.Item.Detail.Metadata.Separator />
//         <List.Item.Detail.Metadata.Label title={configVal[0].value.toString()}/>
//         <List.Item.Detail.Metadata.Separator />
//       </List.Item.Detail.Metadata>
//     }
//   />
//   }

//   return (
//     <List.Item.Detail markdown={JSON.stringify(configVal)}
//     metadata={
//       <List.Item.Detail.Metadata>
//         {buildMetaData()}
//       </List.Item.Detail.Metadata>
//     }
//   />
// )}

export default function ConfigList({...config}: {[index: string]: {index: string, value: string, rules: {value: string|object}[]}[]}) {
  const buildConfigItems = () => {
    return Object.keys(config).map(key => {
      if (key === 'eventDefinitions'){
        return
      }
      const mainVal = config[key]
      if(typeof mainVal != 'string' && mainVal.length === 1 && 'value' in mainVal[0] && !mainVal[0].value){
        return
      }
      let detail
      switch(true){
        case typeof mainVal === 'string' || typeof mainVal === 'number' || typeof mainVal === 'boolean':
          detail = mainVal;
          break;
        case mainVal.length === 1 && 'value' in mainVal[0]:
          detail = mainVal[0].value.toString();
          break;
        case 'rules' in mainVal[0]:
          detail = JSON.stringify(mainVal.map(val => val.rules.map(rule => rule.value).flat()).flat())
          break;
        default:
          detail = JSON.stringify({"NEEDS CASE": mainVal})
      }
      return <List.Item key ={key} title={key} detail={<List.Item.Detail markdown={detail}/>}/>
    })
  }

  /* With Metadata */
  // const buildConfigItems = () => {
  //   return Object.keys(config).map(key => {
  //     const configVal = config[key]
  //     if(typeof configVal != 'string' && !('events' in configVal) && 'value' in configVal[0] && configVal[0].value === false){
  //       return
  //     }
  //     return <List.Item key={key} title={key} detail={<ConfigMetaData configVal={config[key]}/>}/>
  //   })
  // }

  return (
    <List isShowingDetail>
      {buildConfigItems()}
    </List>
  )
}
