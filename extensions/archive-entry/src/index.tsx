import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { showFailureToast } from '@raycast/utils';
import { useEffect, useState } from 'react';
import fetch  from "node-fetch";
import { fileFromPath } from 'formdata-node/file-from-path';
import { FormData } from 'formdata-node';
// import fs from "fs";
const fs = require("fs");

type Values = {
  title: string;
  nsfw: boolean;
  notes: string;
  tags: string;
  source: string;
  category: string;
  media: string[];
};

export default function Command() {
  const headers = {
    "Authorization": "Basic " + btoa('linus@saman.design:sunilinus2804')
  }
  async function handleSubmit(values: Values) {
    console.log(values);

    await fetch(`https://archive.saman.design/api/pages/entries/children`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        'title': values.title,
        'slug': values.title.toLowerCase().replaceAll(' ', '-'),
        'template': 'entry',
        'content': {
          'tags': values.tags,
          'source': values.source,
          'category': values.category,
          'nsfw': values.nsfw,
          'notes': values.notes
        }
      })
    })
    .then(response => response.json())
    .then((response: any) => {
      console.log(response);
      uploadFiles(response.data.slug, values.media)
    })
    .catch(error => {
      showFailureToast(error, { title: "Failed to create entry" });
      console.log(error);
    });
  }

  async function uploadFiles(slug: string, files: string[]) {
    for (const file of files) {
      const data = new FormData();
      data.set('file', await fileFromPath(file))
      data.set('template', 'media');

      await fetch(`https://archive.saman.design/api/pages/entries+${slug}/files`, {
        method: 'POST',
        headers: headers,
        body: data
      })
      .then(response => response.json())
      .then((response: any) => {
        console.log(response)
        addFileToEntryContent(response.data.parent.id, response.data.content.uuid)
        // showToast({ title: "Entry created", message: "Files are uploaded" });
      })
      .catch(error => {
        showFailureToast(error, { title: "Failed to upload files" });
        console.log(error);
      });
    }

  }

  async function addFileToEntryContent(parent: string, uuid: string) {
    await fetch(`https://archive.saman.design/api/pages/${parent}`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify({
        'media': {
          
        }
      })
    })
  }


  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      await fetch("https://archive.saman.design/api/site/children?status=listed", {
        method: "GET",
        headers: headers
      })
      .then(response => response.json())
      .then((response: any) => {
        console.log(response.data.length)
        setCategories(response.data);
        setLoading(false);
      })
      .catch(error => {
        showFailureToast(error, { title: "Failed to fetch categories" });
        console.log(error);
        setLoading(false);
      });
    }

    fetchCategories();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Project name, etc." />
      <Form.TextField id="tags" title="Tags" placeholder="berlin, house, concrete, …" info="Add all tags separated by a comma" />
      <Form.TextField id="source" title="Source" placeholder="https://…" />
      <Form.FilePicker id="media" title="Media" />
      {!loading && categories.length > 0 && (
        <Form.Dropdown id="category" title="Category">
          {categories.map((category: any) => (
            <Form.Dropdown.Item key={category.id} value={`- ${category.uuid}`} title={category.title} />
          ))}
        </Form.Dropdown> 
      )}
      <Form.Checkbox id="nsfw" title="NSFW" label="Is not safe" storeValue />
      <Form.TextArea id="notes" title="Notes" placeholder="Enter notes about this entry…" />
    </Form>
  );
}
