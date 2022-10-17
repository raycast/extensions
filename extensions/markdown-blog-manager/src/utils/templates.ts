import path from 'path';
import fs from 'fs';
import preferences from './preferences';

/**
 * If no template file is used, this is the default template that we'll fall-back to.
 */
const defaultTemplate = `
---
title: __title__ 
date: __date__
---

Once upon a time...
`.trim();

export function getPostTemplate(category: string) {
	const templatePath = path.join(preferences().draftsPath, category, '.template.md');
	if (category && fs.existsSync(templatePath)) {
		return fs.readFileSync(templatePath, 'utf8');
	}

	const defaultTemplatePath = path.join(preferences().draftsPath, '.template.md');
	if (fs.existsSync(defaultTemplatePath)) {
		return fs.readFileSync(defaultTemplatePath, 'utf8');
	}

	return defaultTemplate;
}

export function fillTemplateVariables(category: string, title: string, summary: string) {
	let template = getPostTemplate(category);

	template = template.replaceAll('__title__', title);
	template = template.replaceAll('__summary__', summary);
	template = template.replaceAll('__date__', new Date().toISOString().split('T')[0]);

	return template;
}
