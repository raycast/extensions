import {
  preferences,
  render,
  Icon,
  ImageMask,
  Color,
  List,
  Form,
  Detail,
  ActionPanel,
  SubmitFormAction,
  CopyToClipboardAction,
  OpenInBrowserAction,
  showToast,
  ToastStyle
} from "@raycast/api";

import { v4 as uuidv4 } from 'uuid';


export default function newRaycastService() {
  return new RaycastService();
}


var RaycastService = function() {

  this.newForm = function (isLoading, formElements, actionPanelSections) { return new FormBuilder (isLoading, formElements, actionPanelSections); }
  this.newFormElement = function (id, title, defaultValue, onChangeFunction) { return new FormElementBuilder (id, title, defaultValue, onChangeFunction); }
  this.newFormElementItem = function (title, value, icon) { return new FormElementItemBuilder (title, value, icon); }


  this.newList = function () { return new ListBuilder(); }
  this.newListSection = function () { return new ListSectionBuilder(); }
  this.newListItem = function () { return new ListItemBuilder(); }

  this.newDetail = function (markdown, isLoading, actionPanelSections) { return new DetailBuilder (markdown, isLoading, actionPanelSections); }

  this.newActionPanelSection = function () { return new ActionPanelSectionBuilder(); }
  this.newActionPanelItem = function () { return new ActionPanelItemBuilder(); }

  this.newIcon = function () { return new IconBuilder(); }

  // Enums
  this.Icon = Icon;
  this.ImageMask = ImageMask;
  this.Color = Color;

  this.ActionType = {
    Custom: ActionPanel.Item,
    CopyToClipboard: CopyToClipboardAction,
    OpenInBrowser: OpenInBrowserAction,
    SubmitFormAction: SubmitFormAction,
  };

  this.FormElementType = {
    TextField: Form.TextField,
    Dropdown: Form.Dropdown,
    Checkbox: Form.Checkbox,
    TagPicker: Form.TagPicker,
    DatePicker: Form.DatePicker,
    Separator: Form.Separator,
  };

  this.preferences = preferences;

  this.ToastStyle = ToastStyle;
  this.showToast = showToast;
  

  return this;
};


var DetailBuilder = function (markdown, isLoading, actionPanelSections) {

  // Generate some unique key
  this.key = 'detail-'+uuidv4();

  this.type = 'Detail';

  this.markdown = markdown;
  this.isLoading = isLoading;

  this.actionPanelSections = ((actionPanelSections && actionPanelSections[0]) ? actionPanelSections : []);

  this.render = function (){
    render (
      <Detail 
        key={this.key}
        markdown={this.markdown} 
        isLoading={this.isLoading} 
        actions={((this.actionPanelSections) ? ActionsComponent(this.actionPanelSections) : null)}
      >
      </Detail>)
    return this;
  }

  return this;
};

DetailBuilder.prototype.setMarkdown = setProperty('markdown');
DetailBuilder.prototype.setIsLoading = setProperty('isLoading');
DetailBuilder.prototype.addActionPanelSection = addToList('actionPanelSections')



var FormBuilder = function (isLoading, formElements, actionPanelSections) {

  // Generate some unique key
  this.key = 'form-'+uuidv4();

  this.type = 'Form';


  this.actionPanelSections = ((actionPanelSections && actionPanelSections[0]) ? actionPanelSections : []);
  this.formElements = ((formElements && formElements[0]) ? formElements : []);

  this.isLoading = isLoading;


  this.render = function (){
    render (
      <Form key={this.key} isLoading={this.isLoading} actions={((this.actionPanelSections) ? ActionsComponent(this.actionPanelSections) : null)}>
      {this.formElements.map(function (formElement) {
        const FormElementType = formElement.formElementType;
        return (
          <FormElementType 
          key={formElement.key} 
          id={formElement.id} 
          title={formElement.title} 
          label={formElement.label}
          placeholder={formElement.placeholder}
          defaultValue={formElement.defaultValue} 
          onChange={formElement.onChangeFunction}>

          {formElement.formElementItems.map((formElementItem) => (
            <FormElementType.Item
            key={formElementItem.key}
            value={formElementItem.value}
            title={formElementItem.title}
            icon={formElementItem.icon}
            >
            </FormElementType.Item>
            ))}

          </FormElementType>          
          )})}
      </Form>
      )
return this;
}

return this;
};


FormBuilder.prototype.addFormElement = function (FormElement) {
  this.formElements.push(FormElement)
  return this
};

FormBuilder.prototype.addActionPanelSection = addActionPanelSection;
FormBuilder.prototype.setIsLoading = setIsLoading;





var FormElementBuilder = function (id, title, defaultValue, onChangeFunction) {

  // Generate some unique key
  this.key = 'form-element-'+uuidv4();

  this.title = title;
  this.label = title;
  this.defaultValue = defaultValue;
  this.onChangeFunction = onChangeFunction;
  this.id = id;

  // Default form type TextField
  this.formElementType = Form.TextField;

  // Items for Dropdown anf TagPicker form element
  this.formElementItems = [];


  return this;
};

FormElementBuilder.prototype.setId = setProperty('id');
FormElementBuilder.prototype.setTitle = setProperty('title');
FormElementBuilder.prototype.setLabel = setProperty('label');
FormElementBuilder.prototype.setPlaceholder = setProperty('placeholder');
FormElementBuilder.prototype.setDefaultValue = setProperty('defaultValue');
FormElementBuilder.prototype.setOnChangeFunction = setProperty('onChangeFunction');
FormElementBuilder.prototype.setFormElementType = setProperty('formElementType');
FormElementBuilder.prototype.addFormElementItem = addToList('formElementItems')
FormElementBuilder.prototype.addFormElementItems = addMultipleToList('formElementItems')





var FormElementItemBuilder = function (title, value, icon){

  this.title = title;
  this.value = value;
  this.icon = icon;
  
  // Generate some unique key
  this.key = 'form-dropdown-item-'+uuidv4();

  return this;
};

FormElementItemBuilder.prototype.setValue = setProperty('value');
FormElementItemBuilder.prototype.setTitle = setProperty('title');
FormElementItemBuilder.prototype.setIcon = setProperty('icon');




var ListBuilder = function() {

  // Generate some unique key
  this.key = 'list-'+uuidv4();

  this.type = 'List';

  this.setPlaceholder = setPlaceholder;

  this.setIsLoading = setIsLoading;

  this.addOnSearchTextChangeFunction = function (onSearchTextChangeFunction, throttle) {
    this.onSearchTextChangeFunction = onSearchTextChangeFunction;
    if(throttle){
      this.throttle = true;
    }
    return this
  }


  this.listSections = []

  this.addListSection = function (ListSection) {
    this.listSections.push(ListSection)
    return this
  }
  

  this.render = function (){
    render (
      <List key={this.key} searchBarPlaceholder={this.placeholder} isLoading={this.isLoading} onSearchTextChange={this.onSearchTextChangeFunction} throttle={this.throttle}>
      {this.listSections.map((listSection) => (
        <List.Section key={listSection.key} title={listSection.title}>
        {listSection.listItems.map((listItem) => (
          <List.Item
          key={listItem.key}
          title={listItem.title}
          subtitle={listItem.subtitle}
          icon={listItem.icon}
          accessoryTitle={listItem.accessoryTitle}
          actions={((listItem.actionPanelSections) ? ActionsComponent(listItem.actionPanelSections) : null)}
          >
          </List.Item>
          ))}
        </List.Section>
        ))}
      </List>
      )
    return this;
  }

  return this;
};


var ListSectionBuilder = function() {

  // Generate some unique key
  this.key = 'list-section-'+uuidv4();

  this.type = 'List.Section';

  this.setTitle = setTitle;

  this.listItems = []

  this.addListItem = function (ListItem) {
    this.listItems.push(ListItem)
    return this
  }

  this.clearListItem = function () {
    this.listItems = []
    return this
  }

  return this;
};


var ListItemBuilder = function() {

  // Generate some unique key
  this.key = 'list-item-'+uuidv4();

  this.type = 'List.Item';


  this.setTitle = setTitle;  

  this.getTitle = getTitle;


  this.setSubtitle = setSubtitle;  

  this.getSubtitle = getSubtitle;


  this.setAccessoryTitle = setAccessoryTitle;

  this.getAccessoryTitle = getAccessoryTitle;


  this.actionPanelSections = [];
  this.addActionPanelSection = addActionPanelSection; 

  this.setIcon = setIcon;

  return this;
};

ListItemBuilder.prototype.setSubtitle = setProperty('subtitle');
ListItemBuilder.prototype.setAccessoryTitle = setProperty('accessoryTitle');
ListItemBuilder.prototype.addActionPanelSection = addToList('actionPanelSections');
ListItemBuilder.prototype.addActionPanelSections = addMultipleToList('actionPanelSections');


function addActionPanelSection (ActionPanelSection) {
  this.actionPanelSections.push(ActionPanelSection)
  return this
}

var ActionPanelSectionBuilder = function() {

  // Generate some unique key
  this.key = 'action-panel-section-'+uuidv4();

  this.type = 'ActionPanel.Section';

  this.setTitle = setTitle;  

  this.getTitle = getTitle;

  this.actionPanelItems = []

  this.addActionPanelItem = function (ActionPanelItem) {
    this.actionPanelItems.push(ActionPanelItem)
    return this
  }

  this.addActionPanelItems = function (ActionPanelItems) {
    for (var i = 0; i < ActionPanelItems.length; i++) {
      this.actionPanelItems.push(ActionPanelItems[i])
    }
    return this
  }

  this.deleteAllActionPanelItems = function () {
    this.actionPanelItems = []
    return this
  }

  return this;
};

var ActionPanelItemBuilder = function() {

  // Generate some unique key
  this.key = 'action-panel-item-'+uuidv4();

  this.type = 'ActionPanel.Item';

  this.setTitle = setTitle;  

  this.getTitle = getTitle;

  this.setIcon = setIcon;

  this.actionType = ActionPanel.Item;

  this.setActionType = function (ActionType){
    this.actionType = ActionType;
    return this;
  }

  this.setOnActionFunction = function (onActionFunction) {
    this.onActionFunction = onActionFunction;
    return this;
  }

  this.setOnSubmitFunction = function (onSubmitFunction) {
    this.onSubmitFunction = onSubmitFunction;
    return this;
  }

  this.setShortcut = setShortcut;

  this.setContent = setContent;

  this.setUrl = setUrl;

  return this;
};


var ActionsComponent = function(actionPanelSections) {

  return (<ActionPanel>
    {actionPanelSections.map(function (actionPanelSection) {
      return (
        <ActionPanel.Section key={actionPanelSection.key} title={actionPanelSection.title}>      
        {((actionPanelSection.actionPanelItems) ? actionPanelSection.actionPanelItems : []).map(function (actionPanelItem) {
          const ActionTypeComponent = actionPanelItem.actionType;
          return (
            <ActionTypeComponent
              key={actionPanelItem.key}
              title={actionPanelItem.title}
              icon={actionPanelItem.icon}
              onAction={actionPanelItem.onActionFunction} 
              content={actionPanelItem.content}     
              url={actionPanelItem.url}  
              shortcut={actionPanelItem.shortcut}    
              onSubmit={actionPanelItem.onSubmitFunction}
            >
            </ActionTypeComponent>
            )})}
        </ActionPanel.Section> 
        )})}
    </ActionPanel>)
}



var IconBuilder = function() {

  // Generate some unique key
  this.key = 'icon-'+uuidv4();

  this.type = 'Icon';

  this.setSource = setSource;  

  this.setTintColor = setTintColor;  

  return this;
};

function setContent (content) {
  this.content = content;
  return this;
}

function setUrl (url) {
  this.url = url;
  return this;
}


function setSource(source){
  this.source = source;
  return this;
}

function setTintColor(tintColor){
  this.tintColor = tintColor;
  return this;
}

function setIsLoading(boolean){
  this.isLoading = boolean
  return this;
}

function setTitle(title){
  this.title = title;
  return this;
}

function getTitle(){
  return this.title;
}

function setSubtitle(subtitle){
  this.subtitle = subtitle;
  return this;
}

function getSubtitle(){
  return this.subtitle;
}

function setAccessoryTitle(accessoryTitle){
  this.accessoryTitle = accessoryTitle;
  return this;
}

function getAccessoryTitle(){
  return this.accessoryTitle;
}


function setPlaceholder(placeholder){
  this.placeholder = placeholder;
  return this;
}

function setIcon(icon){
  this.icon = icon;
  return this;
}

function setShortcut(shortcutObject){
  this.shortcut = shortcutObject;
  return this;
}

function setProperty (prop) {
  return function (value) {
    this[prop] = value;
    return this;
  }
}

function addToList (list) {
  return function (value) {
    this[list].push(value);
    return this;
  }
}

function addMultipleToList (list) {
  return function (values) {
    for (var i = 0; i < values.length; i++) {
      this[list].push(values[i]);
    }    
    return this;
  }
}
