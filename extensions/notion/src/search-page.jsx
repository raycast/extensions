import RaycastService from './common/RaycastService'
import NotionAPI from './common/NotionAPI'

const RS = RaycastService()

const N = NotionAPI(RS.preferences);

const moment = require("moment")


import main from './create-database-item'


const notionPageList = RS.newList()
.setPlaceholder('Search page')

const resultSection = RS.newListSection()
notionPageList.addListSection(resultSection)

export default async function mainSearchPage(query, databaseId, databaseTitle) {

  notionPageList.addOnSearchTextChangeFunction(function (text){
    mainSearchPage(text, databaseId, databaseTitle)
  }, true)
  .setIsLoading(true)
  .render();
  
  var sectionTitle = 'Recently edited';
  if(query) {
    sectionTitle = 'Search results';
  }

  if(databaseTitle) {
    sectionTitle += ' in '+databaseTitle
  }

  resultSection.setTitle(sectionTitle)

  var pages = [];
  if(!databaseId){
    pages = await N.searchPages(query);
  }else{
    pages = await N.searchDatabasePages(databaseId, query)
  }

  resultSection.clearListItem()

  pages.forEach(function (page){ 


    var title = 'Untitled';
    if(page.object === 'database' && page.title && page.title[0] && page.title[0].plain_text){
      title = page.title[0].plain_text;
    }else{  
      Object.keys(page.properties).forEach(function (propId) {
        var prop = page.properties[propId];
        if(prop.type === 'title' && prop.title[0] && prop.title[0].plain_text){
          title = prop.title[0].plain_text;
        }
      })
    }

    var titleEmoji = ((page.icon && page.icon.type === 'emoji') ? page.icon.emoji +' ' : '') + title


    var icon = {source: RS.Icon.TextDocument}
    if(page.icon){
      if(page.icon.type === 'emoji'){
        icon = {
          source: page.icon.emoji
        }
      }else{
        icon = {
          source: page.icon[page.icon.type].url,
          mask: ImageMask.RoundedRectangle
        }
      }
    }

    var pageItem = RS.newListItem()
    .setTitle(title)    
    .setAccessoryTitle(moment(page.last_edited_time).fromNow())
    .setIcon(icon);

    resultSection.addListItem(pageItem)


    const notionActionSection  = RS.newActionPanelSection()
      .setTitle(titleEmoji);

    const createActionSection  = RS.newActionPanelSection()

    const copyActionSection  = RS.newActionPanelSection()  

    pageItem.addActionPanelSections([notionActionSection, createActionSection, copyActionSection])


    const actionCreateNewPage = RS.newActionPanelItem()
        .setTitle('Create New Page')
        .setIcon(RS.Icon.Plus)
        .setShortcut({ modifiers: ["cmd"], key: "n" })
        

    createActionSection.addActionPanelItem(actionCreateNewPage)

    if(page.object === 'database'){

      pageItem.setSubtitle('Database')


      actionCreateNewPage.setOnActionFunction(function () {
          main(page.parent.database_id)
        })



      const actionSearchInDatabase = RS.newActionPanelItem()
      .setTitle('Search in Database')
      .setIcon(RS.Icon.MagnifyingGlass)
      .setOnActionFunction(function () {
        mainSearchPage('', page.id, titleEmoji)
      })

      notionActionSection.addActionPanelItem(actionSearchInDatabase)
    } else {

      actionCreateNewPage.setOnActionFunction(function () {
          main()
        })

      const actionPreviewPage = RS.newActionPanelItem()
        .setTitle('Preview Page')
        .setIcon(RS.Icon.Eye)
        .setOnActionFunction(function () {
          pagePreview(page.id, titleEmoji)
        })

      notionActionSection.addActionPanelItem(actionPreviewPage)
    } 

    var notionLinks = N.getNotionLinks(page.id) 

    const actionOpenWebPage = RS.newActionPanelItem()
    .setTitle('Open in Browser')
    .setActionType(RS.ActionType.OpenInBrowser)
    .setUrl(notionLinks.web)      

    notionActionSection.addActionPanelItem(actionOpenWebPage)

    if(notionLinks.deeplink){
      const actionOpenPageInApp = RS.newActionPanelItem()
      .setTitle('Open in Notion')
      .setIcon('./notion-logo.png')
      .setActionType(RS.ActionType.OpenInBrowser)
      .setShortcut({ modifiers: ["cmd"], key: "o" })
      .setUrl(notionLinks.deeplink)      

      notionActionSection.addActionPanelItem(actionOpenPageInApp)
    }

    const actionCopyLink = RS.newActionPanelItem()
      .setTitle('Copy Link')
      .setActionType(RS.ActionType.CopyToClipboard)
      .setContent(notionLinks.web)

    copyActionSection.addActionPanelItem(actionCopyLink)

  })

  notionPageList
    .setIsLoading(false)
    .render()
}




async function pagePreview(pageId, pageTitle) {


  var pageContent = '# '+pageTitle+'\n\n';


  const notionPagePreview = RS.newDetail(pageContent, true)


  const notionActionSection  = RS.newActionPanelSection()
  .setTitle(pageTitle);

  notionPagePreview.addActionPanelSection(notionActionSection)


  const copyActionSection  = RS.newActionPanelSection()      
  notionPagePreview.addActionPanelSection(copyActionSection)

  var notionLinks = N.getNotionLinks(pageId) 

  
  const actionOpenWebPage = RS.newActionPanelItem()
  .setTitle('Open in Browser')
  .setActionType(RS.ActionType.OpenInBrowser)
  .setUrl(notionLinks.web)      

  notionActionSection.addActionPanelItem(actionOpenWebPage)

  if(notionLinks.deeplink){
    const actionOpenPageInApp = RS.newActionPanelItem()
    .setTitle('Open in Notion')
    .setIcon('./notion-logo.png')
    .setActionType(RS.ActionType.OpenInBrowser)
    .setShortcut({ modifiers: ["cmd"], key: "o" })
    .setUrl(notionLinks.deeplink)      

    notionActionSection.addActionPanelItem(actionOpenPageInApp)
  }

  const actionCopyLink = RS.newActionPanelItem()
  .setTitle('Copy Link')
  .setActionType(RS.ActionType.CopyToClipboard)
  .setContent(notionLinks.web)

  copyActionSection.addActionPanelItem(actionCopyLink)

  notionPagePreview.render()


  const PageBlocks = await N.getPageContent(pageId);
  

  PageBlocks.forEach(function(block){
    try {
      if(block.type !== 'image'){
        var tempText = '';

        if(block[block.type].text[0]){


          try {
            block[block.type].text.forEach(function(text){
              if(text.plain_text){
                tempText+=notionTextToMarkdown(text)
              }
            });

          }catch(e){

          }

        }else {
          if(block[block.type].text.plain_text){
            tempText+=notionTextToMarkdown(block[block.type].text)
          }
        }

      pageContent+=notionBlockToMarkdown(tempText,block.type)+'\n'

      }else{
        pageContent+='![image]('+block.image.file.url+')'+'\n'
      }
    }catch(e){

    }

  })

  notionPagePreview
  .setMarkdown(pageContent)
  .setIsLoading(false)
  .render()

}


function notionBlockToMarkdown(text, type){
  switch(type) { 
    case ('heading_1'): { 
      return '# '+text
    }
    case ('heading_2'): { 
      return '## '+text
    }
    case ('heading_3'): { 
      return '### '+text
    }
    case ('bulleted_list_item'): { 
      return '- '+text
    }
    case ('numbered_list_item'): { 
      return '1. '+text
    } 

    default: { 
      return text
    } 
  }
}

function notionTextToMarkdown (text){
  var plainText = text.plain_text;
  if(text.annotations.bold){
    plainText = '**'+plainText+'**'
  }else if(text.annotations.italic){
    plainText = '*'+plainText+'*'
  }else if(text.annotations.code){
    plainText = '`'+plainText+'`'
  }

  if(text.href){
    if(text.href.startsWith('/')){
      plainText = '['+plainText+']('+getPageUrl(text.href.replace('/',''))+')'
    }else{
      plainText = '['+plainText+']('+text.href+')'
    }
  }

  return plainText
}

