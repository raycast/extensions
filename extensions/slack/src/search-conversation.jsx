import RaycastService from './common/RaycastService'
const RS = RaycastService()

import SlackAPI from './common/SlackAPI'
const S = SlackAPI(RS.preferences.slack_token.value);

const moment = require("moment")

export default async function main(query, parentId) {  

  const List = RS.newList()
    .setPlaceholder('Search file')
    .setIsLoading(true)
    // Need admin rights to search channel
    //.addOnSearchTextChangeFunction(main, true) 
    .render();


  const userSection = RS.newListSection().setTitle('Users')
  List.addListSection(userSection)

  const channelSection = RS.newListSection().setTitle('Channels')
  List.addListSection(channelSection)

  var conversationLoading = true;
  var userLoading = true;

  S.listConversations(function (conversationList){
    conversationList.forEach(function (conversation) {

      var conversationLinks = S.getChannelLinks(conversation.shared_team_ids[0], conversation.id)


      const conversationItem = RS.newListItem()
        .setTitle(conversation.name)
        .setAccessoryTitle(conversation.num_members+' members')
        .setIcon(RS.Icon.Bubble);
      channelSection.addListItem(conversationItem)


      const actionSection = RS.newActionPanelSection()
        .setTitle(conversation.name); 
      conversationItem.addActionPanelSection(actionSection)


      const actionOpenConversation = RS.newActionPanelItem()
        .setTitle('Open in Slack')
        .setIcon('./slack.png')
        .setActionType(RS.ActionType.OpenInBrowser)
        .setUrl(conversationLinks.deeplink)

      const actionCopyLink = RS.newActionPanelItem()
        .setTitle('Copy Channel Link')
        .setActionType(RS.ActionType.CopyToClipboard)
        .setContent(conversationLinks.web)      

      actionSection.addActionPanelItems([actionOpenConversation, actionCopyLink])      
    });
    
    conversationLoading = false;

    List.setIsLoading(conversationLoading || userLoading).render()
  })
    

   S.listUsers(function (userList){
    userList.forEach(function (user) {

      var userLinks = S.getUserLinks(user.team_id, user.id)
      var icon = { source: user.profile.image_512, mask: RS.ImageMask.RoundedRectangle};


      const userItem = RS.newListItem()
        .setTitle(user.real_name)
        .setSubtitle(S.emojify(user.profile.status_emoji + ' ' +user.profile.status_text_canonical))
        .setAccessoryTitle((user.profile.status_expiration ? 'status ends '+moment(user.profile.status_expiration*1000).fromNow() : null))
        .setIcon(icon);
      userSection.addListItem(userItem)



      const actionSection = RS.newActionPanelSection()
        .setTitle(user.name); 
      userItem.addActionPanelSection(actionSection)


      const actionOpenConversation = RS.newActionPanelItem()
        .setTitle('Open in Slack')
        .setIcon('./slack.png')
        .setActionType(RS.ActionType.OpenInBrowser)
        .setUrl(userLinks.deeplink)

      actionSection.addActionPanelItems([actionOpenConversation])    
      
    });

    userLoading = false;
    
    List.setIsLoading(conversationLoading || userLoading).render()
  })

  

}