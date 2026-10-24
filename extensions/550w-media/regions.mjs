export const regions = {
  global: {name:'550w-media',title:'550W Watermark & Text Eraser',description:'Erase image watermarks and text, local video subtitles and watermarks, and resolve TikTok and X share links.',command:'Process Media',commandDescription:'Upload images and videos or resolve copied TikTok and X share links',home:'https://eraser.550wai.com/',key:'https://eraser.550wai.com/api/',purchase:'https://eraser.550wai.com/purchase/',channel:'raycast-store-candidate'},
  cn: {name:'550w-media-cn',title:'550W AI去字幕去水印',description:'处理图片水印和文字、本地视频字幕和水印，解析抖音、快手、哔哩哔哩、微博分享链接。',command:'图片视频去字幕去水印',commandDescription:'上传本地图片或视频，或粘贴平台分享链接去水印',home:'https://qzm.550wai.cn/',key:'https://qzm.550wai.cn/api-keys/',purchase:'https://qzm.550wai.cn/purchase?tab=speed',channel:'self-distribution-candidate'},
};
export function regionalManifest(base, region) {
  const config=regions[region];
  if (!config) throw new Error('Unsupported Raycast region');
  const cn=region==='cn';
  return {...base,name:config.name,title:config.title,description:config.description,commands:base.commands.map(command=>({...command,title:config.command,description:config.commandDescription})),preferences:base.preferences.filter(p=>p.name!=='region').map(p=>p.name==='authMode'?{...p,title:cn?'接入方式':'Authentication',description:cn?'OAuth 账户授权或 API Key':'OAuth account connection or API Key'}:({...p,title:p.name==='userNo'?(cn?'用户编号':'User No'):'API Key',description:p.name==='apiKey'?(cn?'获取和管理密钥：':'Get and manage your key: ')+config.key:(cn?'API 账户用户编号':'API account user number')}))};
}
