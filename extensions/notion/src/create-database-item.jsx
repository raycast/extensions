import RaycastService from './common/RaycastService'
import NotionAPI from './common/NotionAPI'

const RS = RaycastService()

const N = NotionAPI(RS.preferences);


import mainSearchPage from './search-page'


export default async function main(databaseId) {

  const databasesDropdown = RS.newFormElement('databaseId', 'Databases')
      .setFormElementType(RS.FormElementType.Dropdown)
      .setOnChangeFunction(main)

  const createDatabaseItemForm = RS.newForm(true)
    .addFormElement(databasesDropdown)
    .addFormElement(RS.newFormElement().setFormElementType(RS.FormElementType.Separator))
    .render();
  

  const actionSubmit = RS.newActionPanelItem()
    .setTitle('Create Page')
    .setActionType(RS.ActionType.SubmitFormAction)
    .setIcon(RS.Icon.Bubble)
    .setOnSubmitFunction(async function (form) {
      var page = await N.createDatabaseItem(form)
      if(page){
        RS.showToast(RS.ToastStyle.Success, "Page Created");
        mainSearchPage('', page.parent.database_id)
      }else{
        RS.showToast(RS.ToastStyle.Failure, "Page Not Created");
      }
    })

  const actionSection = RS.newActionPanelSection()
    .setTitle('Notion')
    .addActionPanelItem(actionSubmit)

  createDatabaseItemForm.addActionPanelSection(actionSection)

  
  const databases = await N.getDatabases()

  if(databases && databases[0] && databases[0].id){

    databases.forEach(function (database){

      var icon = { source: ((database.icon) ? ((database.icon.type === 'emoji') ? database.icon.emoji : database.icon[database.icon.type].url) : RS.Icon.TextDocument) };
      
      var databaseItem = RS.newFormElementItem()
        .setTitle(((database.title && database.title[0] && database.title[0].plain_text) ? database.title[0].plain_text : 'Untitled'))
        .setValue(database.id)
        .setIcon(icon)

      databasesDropdown.addFormElementItem(databaseItem)
    })

    createDatabaseItemForm.render()
    

    var tempDatabaseId = databases[0].id;
    if(databaseId){
      tempDatabaseId = databaseId
    }   

    const databaseProps = await N.getDatabaseProperties(tempDatabaseId);

     console.log('databaseProps',databaseProps)

    if(databaseProps && Object.keys(databaseProps)[0]){


      // Add action only once property are loaded
      
      
     
      Object.keys(databaseProps).reverse().forEach(function (propKey) {

        var databaseProp = databaseProps[propKey];
        var propType = databaseProp.type;

        var databasePropFormElement = RS.newFormElement()        
          .setId('property::'+databaseProp.type+'::'+databaseProp.id)
          .setTitle(databaseProp.name)


        if( propType === 'title') {
          databasePropFormElement.setPlaceholder('Title')
            .setFormElementType(RS.FormElementType.TextField)

        }else if( propType === 'rich_text') { 
          databasePropFormElement.setPlaceholder('Text')
            .setFormElementType(RS.FormElementType.TextField)

        }else if( propType === 'number') { 
          databasePropFormElement.setPlaceholder('Number'+((databaseProp.number.format!=='number') ? ' ('+databaseProp.number.format+')' : ''))
            .setFormElementType(RS.FormElementType.TextField)

        }else if( propType === 'url') { 
          databasePropFormElement.setPlaceholder('URL')
            .setFormElementType(RS.FormElementType.TextField)

        }else if( propType === 'email') { 
          databasePropFormElement.setPlaceholder('Email')
            .setFormElementType(RS.FormElementType.TextField)

        }else if( propType === 'phone_number') { 
          databasePropFormElement.setPlaceholder('Phone number')
            .setFormElementType(RS.FormElementType.TextField)

        }else if( propType === 'date') { 

          var dateStartFormElement = RS.newFormElement()        
            .setId('property::'+databaseProp.type+'::'+databaseProp.id)
            .setTitle(databaseProp.name)
            .setFormElementType(RS.FormElementType.DatePicker)

          createDatabaseItemForm.addFormElement(dateStartFormElement)

          databasePropFormElement.setId('property::date_end::'+databaseProp.id)
            .setTitle('↳ ')
            .setFormElementType(RS.FormElementType.DatePicker)

        }else if( propType === 'checkbox') { 

            databasePropFormElement.setLabel('Checkbox')
              .setFormElementType(RS.FormElementType.Checkbox)

        }else if( propType === 'select') { 

          databasePropFormElement.setFormElementType(RS.FormElementType.Dropdown)
          databasePropFormElement.addFormElementItem(RS.newFormElementItem('No Selection', '_select_null_'))

          databaseProp.select.options.forEach(function (option) {
            var formElementItem = RS.newFormElementItem(option.name, option.id)
              .setIcon({ source: RS.Icon.Dot, tintColor: notionColorToTintColor(option.color) })

            databasePropFormElement.addFormElementItem(formElementItem)
          })

        }else if( propType === 'multi_select') { 

          databasePropFormElement.setFormElementType(RS.FormElementType.TagPicker)

          databaseProp.multi_select.options.forEach(function (option) {
            var formElementItem = RS.newFormElementItem(option.name, option.id)
              .setIcon({ source: RS.Icon.Dot, tintColor: notionColorToTintColor(option.color) })

            databasePropFormElement.addFormElementItem(formElementItem)
          })
        
        }else if( propType === 'people') { 

          databasePropFormElement.setFormElementType(RS.FormElementType.TagPicker)
            .setPlaceholder(databaseProp._users[0].name+', ...')

          databaseProp._users.forEach(function (user) {

            // Bot are not yet suported via API
            if(user.type !== 'bot'){
              var icon = { source: RS.Icon.Person};

              if(user.avatar_url){
                icon = { source: user.avatar_url, mask: RS.ImageMask.Circle};
              }

              var formElementItem = RS.newFormElementItem(user.name, user.id, icon)

              databasePropFormElement.addFormElementItem(formElementItem)
            }
            
          })
        
        }else if( propType === 'relation') { 


          databasePropFormElement.setFormElementType(RS.FormElementType.TagPicker)
            .setPlaceholder('Select Relation')

          databaseProp._relations.forEach(function (relation) {

            var title = 'Untitled';
            Object.keys(relation.properties).forEach(function (propId) {
              var prop = relation.properties[propId];
              if(prop.type === 'title' && prop.title[0] && prop.title[0].plain_text){
                title = prop.title[0].plain_text;
              }
            })


            var icon = {source: RS.Icon.TextDocument}
            if(relation.icon){
              if(relation.icon.type === 'emoji'){
                icon = {
                  source: relation.icon.emoji
                }
              }else{
                icon = {
                  source: relation.icon[relation.icon.type].url,
                  mask: RS.ImageMask.RoundedRectangle
                }
              }
            }

            var formElementItem = RS.newFormElementItem(title, relation.id, icon)

            databasePropFormElement.addFormElementItem(formElementItem)
        
              
          })
        }else {
          return
        }
         

        createDatabaseItemForm.addFormElement(databasePropFormElement)
      })

      createDatabaseItemForm.setIsLoading(false)
        .render()

    }else{
      console.error('Database properties does not exist',databaseProps)
    }    
  }else{
    //render(<Detail markdown={'## No databases available \n\n Make sure to **Invite** at least one database with the integration you have created.\n ![NotionShare](https://images.ctfassets.net/lzny33ho1g45/2pIkZOvLY2o2dwfnJIYJxt/d5d9f1318b2e79ad92d8197e4abab655/automate-notion-with-zapier-11-share-options.png)' } />)
  }  
}





function notionColorToTintColor (notionColor) {
  return {
    'default': RS.Color.PrimaryText,
    'gray': RS.Color.PrimaryText,
    'brown': RS.Color.Brown,
    'red': RS.Color.Red,
    'blue': RS.Color.Blue,
    'green': RS.Color.Green,
    'yellow': RS.Color.Yellow,
    'orange': RS.Color.Orange,
    'purple': RS.Color.Purple,
    'pink': RS.Color.Magenta
  }[notionColor]
}
