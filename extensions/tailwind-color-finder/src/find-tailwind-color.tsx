import {                                                                      
    Action,                                                                     
    ActionPanel,                                                                
    Color,                                                                      
    Icon,                                                                       
    List,                                                                       
    Clipboard,                                                                  
    showHUD,                                                                    
    getPreferenceValues,                                                        
    LaunchProps,                                                                
  } from "@raycast/api";                                                        
  import { useState, useMemo, useEffect } from "react";                         
  import {                                                                      
    findNearestColors,                                                          
    isValidHex,                                                                 
    distanceToPercentage,                                                       
    hexToRgb,                                                                   
  } from "./nearest-color";                                                     
                                                                                
  interface Preferences {                                                       
    autoClipboard: boolean;                                                     
    tailwindVersion: "v3" | "v4";                                               
  }                                                                             
                                                                                
  interface Arguments {                                                         
    hexColor?: string;                                                          
  }                                                                             
                                                                                
  export default function Command(props: LaunchProps<{ arguments: Arguments }>) 
  {                                                                             
    const preferences = getPreferenceValues<Preferences>();                     
    const argColor = props.arguments?.hexColor || "";                           
    const [searchText, setSearchText] = useState(argColor);                     
    const [isInitialized, setIsInitialized] = useState(!!argColor);             
                                                                                
    useEffect(() => {                                                           
      if (argColor) return;                                                     
                                                                                
      async function checkClipboard() {                                         
        if (preferences.autoClipboard !== false) {                              
          try {                                                                 
            const text = await Clipboard.readText();                            
            if (text) {                                                         
              const trimmed = text.trim();                                      
              const testHex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
              if (isValidHex(testHex)) {                                        
                setSearchText(trimmed);                                         
              }                                                                 
            }                                                                   
          } catch (e) {                                                         
            // Clipboard access failed, ignore                                  
          }                                                                     
        }                                                                       
        setIsInitialized(true);                                                 
      }                                                                         
      checkClipboard();                                                         
    }, [argColor]);                                                             
                                                                                
    const results = useMemo(() => {                                             
      if (!searchText) return [];                                               
      const cleanInput = searchText.trim();                                     
      const hexInput = cleanInput.startsWith("#") ? cleanInput :                
  `#${cleanInput}`;                                                             
      if (!isValidHex(hexInput)) return [];                                     
      return findNearestColors(hexInput, 8, preferences.tailwindVersion);       
    }, [searchText, preferences.tailwindVersion]);                              
                                                                                
    const inputHex = searchText.startsWith("#") ? searchText : `#${searchText}`;
    const inputRgb = hexToRgb(inputHex);                                        
                                                                                
    return (                                                                    
      <List                                                                     
        searchBarPlaceholder="Enter a hex color (e.g., #ff5733 or ff5733)"      
        onSearchTextChange={setSearchText}                                      
        searchText={searchText}                                                 
        throttle                                                                
      >                                                                         
        {!searchText && (                                                       
          <List.EmptyView                                                       
            icon={Icon.EyeDropper}                                              
            title={isInitialized ? "Enter a hex color" : "Loading..."}          
            description={isInitialized ? "Type a hex color code or copy one to  
  your clipboard" : "Checking clipboard..."}                                    
          />                                                                    
        )}                                                                      
                                                                                
        {searchText && !isValidHex(inputHex) && (                               
          <List.EmptyView                                                       
            icon={Icon.ExclamationMark}                                         
            title="Invalid hex color"                                           
            description="Please enter a valid hex color (3 or 6 characters)"    
          />                                                                    
        )}                                                                      
                                                                                
        {results.length > 0 && (                                                
          <>                                                                    
            {inputRgb && (                                                      
              <List.Section title={`Your Color (Tailwind                        
  ${preferences.tailwindVersion})`}>                                            
                <List.Item                                                      
                  icon={{ source: Icon.CircleFilled, tintColor: { light:        
  inputHex, dark: inputHex, adjustContrast: false } }}                          
                  title={inputHex.toUpperCase()}                                
                  subtitle={`RGB(${inputRgb.r}, ${inputRgb.g}, ${inputRgb.b})`} 
                />                                                              
              </List.Section>                                                   
            )}                                                                  
                                                                                
            <List.Section title="Nearest Tailwind Colors">                      
              {results.map((match, index) => {                                  
                const matchPercentage = distanceToPercentage(match.distance);   
                const isExactMatch = match.distance === 0;                      
                                                                                
                return (                                                        
                  <List.Item                                                    
                    key={match.name}                                            
                    icon={{ source: Icon.CircleFilled, tintColor: { light:      
  match.hex, dark: match.hex, adjustContrast: false } }}                        
                    title={match.name}                                          
                    subtitle={match.hex.toUpperCase()}                          
                    accessories={[                                              
                      { text: isExactMatch ? "Exact match!" :                   
  `${matchPercentage}% match`, icon: isExactMatch ? Icon.CheckCircle : undefined
   },                                                                           
                      index === 0 ? { tag: { value: "Best", color: Color.Green }
   } : {},                                                                      
                    ]}                                                          
                    actions={                                                   
                      <ActionPanel>                                             
                        <ActionPanel.Section title="Copy">                      
                          <Action title="Copy Color Name" icon={Icon.Clipboard} 
  onAction={async () => { await Clipboard.copy(match.name); await               
  showHUD(`Copied: ${match.name}`); }} />                                       
                          <Action title="Copy as bg-{color}"                    
  icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd"], key: "b" }}             
  onAction={async () => { await Clipboard.copy(`bg-${match.name}`); await       
  showHUD(`Copied: bg-${match.name}`); }} />                                    
                          <Action title="Copy as text-{color}"                  
  icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd"], key: "t" }}             
  onAction={async () => { await Clipboard.copy(`text-${match.name}`); await     
  showHUD(`Copied: text-${match.name}`); }} />                                  
                          <Action title="Copy as border-{color}"                
  icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd"], key: "d" }}             
  onAction={async () => { await Clipboard.copy(`border-${match.name}`); await   
  showHUD(`Copied: border-${match.name}`); }} />                                
                          <Action title="Copy Hex Value" icon={Icon.Hashtag}    
  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} onAction={async () => {  
  await Clipboard.copy(match.hex); await showHUD(`Copied: ${match.hex}`); }} /> 
                        </ActionPanel.Section>                                  
                      </ActionPanel>                                            
                    }                                                           
                  />                                                            
                );                                                              
              })}                                                               
            </List.Section>                                                     
          </>                                                                   
        )}                                                                      
      </List>                                                                   
    );                                                                          
  }
