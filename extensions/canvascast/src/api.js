import API from '@api-blueprints/pathmaker';
export function api (token, domain) {
    return new API({
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        baseUrl: 'https://' + domain + '/api/v1'
    });
}
