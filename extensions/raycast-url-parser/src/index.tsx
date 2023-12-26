import React, { useEffect, useState } from 'react'
import { urlParser, isValidUrl, IURL, _decodeURI } from './utils/index'
import { Clipboard, Icon } from '@raycast/api'
import { List, showToast, Toast } from "@raycast/api";
import Copy from './components/copy'

export default function Command() {
  const [input, setInput] = useState('')
  const [parsedUrl, setParsedUrl] = useState<IURL>({
    protocol: '',
    host: '',
    port: '',
    pathname: '',
    searchArr: [],
    search: '',
    hash: '',
    username: '',
    password: '',
  })

  useEffect(() => {

    // get clipboard on opened
    Clipboard.readText()
      .then((cbText) => {
        const u = _decodeURI((cbText ?? '').trim())
        if (isValidUrl(u)) setInput(u)
      })

  }, [])

  useEffect(() => {
    if (input.trim()) {
      const u = _decodeURI(input.trim())
      if (isValidUrl(u)) {
        setInput(u)
        setParsedUrl(urlParser(u))
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: 'Error',
          message: 'Please enter the correct URL',
        })
      }
    }
  }, [input])

  return (
    <List
      searchBarPlaceholder="Enter URL to parse"
      throttle
      searchText={input}
      onSearchTextChange={(v) => setInput(v)}
      isShowingDetail
    >
      <List.Item
        icon={Icon.LockUnlocked}
        title="Decode"
        detail={
          <List.Item.Detail
            markdown={_decodeURI(input)}
          />
        }
        actions={Copy(_decodeURI(input))}
      />

      <List.Item
        icon={Icon.Lock}
        title="Encode"
        detail={
          <List.Item.Detail
            markdown={encodeURI(input)}
          />
        }
        actions={Copy(encodeURI(input))}
      />

      {
        parsedUrl.host && <List.Item
          icon={Icon.Link}
          title="Host"
          detail={
            <List.Item.Detail
              markdown={parsedUrl.host}
            />
          }
          actions={Copy(parsedUrl.host)}
        />
      }

      {
        parsedUrl.pathname && <List.Item
          icon={Icon.Flag}
          title="Path"
          detail={
            <List.Item.Detail
              markdown={parsedUrl.pathname}
              metadata={
                <List.Item.Detail.Metadata>
                  < List.Item.Detail.Metadata.Label title='path' text='' />
                  {
                    parsedUrl.pathname.split('/').filter((value) => value !== '').map((val, i) => {
                      return (<React.Fragment key={i}>
                        < List.Item.Detail.Metadata.Label title={val} text={i.toString()} />
                        <List.Item.Detail.Metadata.Separator />
                      </React.Fragment>)
                    })
                  }
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={Copy(parsedUrl.pathname)}
        />
      }

      {
        parsedUrl.search && <List.Item
          icon={Icon.QuestionMark}
          title="Search"
          detail={
            <List.Item.Detail
              markdown={parsedUrl.search}
              metadata={
                <List.Item.Detail.Metadata>
                  < List.Item.Detail.Metadata.Label title='key' text='vlaue' />
                  {
                    parsedUrl.searchArr.map((val, i) => {
                      return (<React.Fragment key={i}>
                        <List.Item.Detail.Metadata.Label title={val[0]} text={val[1]} />
                        <List.Item.Detail.Metadata.Separator />
                      </React.Fragment>)
                    })
                  }
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={Copy(parsedUrl.search)}
        />
      }

      {
        parsedUrl.hash && <List.Item
          icon={Icon.Hashtag}
          title='Hash'
          detail={
            <List.Item.Detail
              markdown={parsedUrl.hash}
            />
          }
          actions={Copy(parsedUrl.hash)}
        />
      }

      {
        parsedUrl.protocol && <List.Item
          icon={Icon.Pencil}
          title="Protocol"
          detail={
            <List.Item.Detail
              markdown={parsedUrl.protocol}
            />
          }
          actions={Copy(parsedUrl.protocol)}
        />
      }

      {
        parsedUrl.port && <List.Item
          icon={Icon.Monitor}
          title="Port"
          detail={
            <List.Item.Detail
              markdown={parsedUrl.port}
            />
          }
          actions={Copy(parsedUrl.port)}
        />
      }

      {
        parsedUrl.username && <List.Item
          icon={Icon.Person}
          title="Username"
          detail={
            <List.Item.Detail
              markdown={parsedUrl.username}
            />
          }
          actions={Copy(parsedUrl.username)}
        />
      }

      {
        parsedUrl.password && <List.Item
          icon={Icon.Key}
          title="Password"
          detail={
            <List.Item.Detail
              markdown={parsedUrl.password}
            />
          }
          actions={Copy(parsedUrl.password)}
        />
      }
    </List >
  );
}
